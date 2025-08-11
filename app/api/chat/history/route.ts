import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/chat/history?userId=xxx&limit=20&page=1&search=keyword
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId') || userId;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'recent'; // recent, oldest, mostMessages
    const filterBy = searchParams.get('filterBy') || 'all'; // all, withMessages, withoutMessages

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    // Build aggregation pipeline
    const pipeline: any[] = [
      {
        $match: {
          $or: [
            { hostId: queryUserId },
            { participants: queryUserId }
          ]
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.MESSAGES,
          localField: 'meetingId',
          foreignField: 'meetingId',
          as: 'messages'
        }
      },
      {
        $addFields: {
          messageCount: { $size: '$messages' },
          lastMessage: { $arrayElemAt: ['$messages', -1] },
          hasMessages: { $gt: [{ $size: '$messages' }, 0] }
        }
      }
    ];

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { 'messages.message': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add filter by message presence
    if (filterBy === 'withMessages') {
      pipeline.push({ $match: { hasMessages: true } });
    } else if (filterBy === 'withoutMessages') {
      pipeline.push({ $match: { hasMessages: false } });
    }

    // Add sorting
    switch (sortBy) {
      case 'oldest':
        pipeline.push({ $sort: { startTime: 1 } });
        break;
      case 'mostMessages':
        pipeline.push({ $sort: { messageCount: -1, startTime: -1 } });
        break;
      case 'recent':
      default:
        pipeline.push({ $sort: { startTime: -1 } });
        break;
    }

    // Add pagination
    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Execute aggregation
    const meetings = await meetingsCollection.aggregate(pipeline).toArray();

    // Get total count for pagination
    const countPipeline = [...pipeline.slice(0, -2)]; // Remove skip and limit
    countPipeline.push({ $count: 'total' });
    const countResult = await meetingsCollection.aggregate(countPipeline).toArray();
    const total = countResult[0]?.total || 0;

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        search,
        sortBy,
        filterBy
      }
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
} 