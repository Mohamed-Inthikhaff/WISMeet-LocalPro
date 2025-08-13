import nodemailer from 'nodemailer';
import { format } from 'date-fns';

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport(emailConfig);
};

// Email templates
const createInvitationEmail = (meetingData: {
  title: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  meetingLink: string;
  guestEmail: string;
}) => {
  const formattedDate = format(meetingData.startTime, 'EEEE, MMMM d, yyyy');
  const formattedStartTime = format(meetingData.startTime, 'h:mm a');
  const formattedEndTime = format(meetingData.endTime, 'h:mm a');

  return {
    from: `"WISMeet" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: meetingData.guestEmail,
    subject: `Meeting Invitation: ${meetingData.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .meeting-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .join-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting Invitation</h1>
            <p>You've been invited to join a meeting</p>
          </div>
          
          <div class="content">
            <h2>${meetingData.title}</h2>
            
            <div class="meeting-details">
              <p><strong>Host:</strong> ${meetingData.hostName}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
              ${meetingData.description ? `<p><strong>Description:</strong> ${meetingData.description}</p>` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${meetingData.meetingLink}" class="join-button">
                Join Meeting
              </a>
            </div>
            
            <p style="margin-top: 20px; color: #666;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${meetingData.meetingLink}" style="color: #667eea;">${meetingData.meetingLink}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>This invitation was sent from WISMeet - Professional Video Conferencing Platform</p>
            <p>If you have any questions, please contact the meeting host.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Meeting Invitation: ${meetingData.title}

You've been invited to join a meeting by ${meetingData.hostName}.

Meeting Details:
- Title: ${meetingData.title}
- Date: ${formattedDate}
- Time: ${formattedStartTime} - ${formattedEndTime}
${meetingData.description ? `- Description: ${meetingData.description}` : ''}

Join the meeting by clicking this link: ${meetingData.meetingLink}

If you have any questions, please contact the meeting host.

Best regards,
WISMeet Team
    `
  };
};

// Enhanced mortgage meeting summary email template
const createMortgageSummaryEmail = (summaryData: {
  clientName: string;
  advisorName: string;
  meetingDate: Date;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  nextSteps: string[];
  meetingType: string;
  clientEmail: string;
  advisorEmail: string;
}) => {
  const formattedDate = format(summaryData.meetingDate, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(summaryData.meetingDate, 'h:mm a');

  return {
    from: `"WISMeet Mortgage Assistant" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: [summaryData.clientEmail, summaryData.advisorEmail],
    subject: `Mortgage Meeting Summary - ${summaryData.meetingType} - ${formattedDate}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mortgage Meeting Summary</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .summary-section { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db; }
          .key-points { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .action-items { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .next-steps { background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .highlight { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; }
          .urgent { background: #f8d7da; border-left: 4px solid #dc3545; }
          .important { background: #d4edda; border-left: 4px solid #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Mortgage Meeting Summary</h1>
            <p>${summaryData.meetingType} - ${formattedDate} at ${formattedTime}</p>
          </div>
          
          <div class="content">
            <div class="summary-section">
              <h2>📝 Meeting Summary</h2>
              <p>${summaryData.summary}</p>
            </div>
            
            <div class="key-points">
              <h3>🔑 Key Points Discussed</h3>
              <ul>
                ${summaryData.keyPoints.map(point => `<li>${point}</li>`).join('')}
              </ul>
            </div>
            
            <div class="action-items">
              <h3>✅ Action Items</h3>
              <ul>
                ${summaryData.actionItems.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            
            <div class="next-steps">
              <h3>🚀 Next Steps</h3>
              <ul>
                ${summaryData.nextSteps.map(step => `<li>${step}</li>`).join('')}
              </ul>
            </div>
            
            <div class="highlight">
              <h3>👥 Meeting Participants</h3>
              <p><strong>Client:</strong> ${summaryData.clientName}</p>
              <p><strong>Advisor:</strong> ${summaryData.advisorName}</p>
            </div>
          </div>
          
          <div class="footer">
            <p>This summary was automatically generated by WISMeet Mortgage Assistant</p>
            <p>For questions or corrections, please contact your mortgage advisor</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              This email contains confidential mortgage information. Please handle with appropriate care.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Mortgage Meeting Summary - ${summaryData.meetingType}

Date: ${formattedDate} at ${formattedTime}
Client: ${summaryData.clientName}
Advisor: ${summaryData.advisorName}

MEETING SUMMARY:
${summaryData.summary}

KEY POINTS DISCUSSED:
${summaryData.keyPoints.map(point => `• ${point}`).join('\n')}

ACTION ITEMS:
${summaryData.actionItems.map(item => `• ${item}`).join('\n')}

NEXT STEPS:
${summaryData.nextSteps.map(step => `• ${step}`).join('\n')}

This summary was automatically generated by WISMeet Mortgage Assistant.
For questions or corrections, please contact your mortgage advisor.

Best regards,
WISMeet Team
    `
  };
};

// Send invitation email
export const sendInvitationEmail = async (meetingData: {
  title: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  meetingLink: string;
  guestEmail: string;
}) => {
  try {
    const transporter = createTransporter();
    const emailContent = createInvitationEmail(meetingData);
    
    const result = await transporter.sendMail(emailContent);
    
    return {
      success: true,
      messageId: result.messageId,
      guestEmail: meetingData.guestEmail
    };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      guestEmail: meetingData.guestEmail
    };
  }
};

// Send mortgage meeting summary email
export const sendMortgageSummaryEmail = async (summaryData: {
  clientName: string;
  advisorName: string;
  meetingDate: Date;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  nextSteps: string[];
  meetingType: string;
  clientEmail: string;
  advisorEmail: string;
}) => {
  try {
    console.log('📧 Attempting to send mortgage summary email...');
    console.log('📧 Email configuration:', {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || '587',
      user: process.env.EMAIL_USER ? '***configured***' : '❌ NOT CONFIGURED',
      pass: process.env.EMAIL_PASS ? '***configured***' : '❌ NOT CONFIGURED',
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '❌ NOT CONFIGURED'
    });
    console.log('📧 Recipients:', [summaryData.clientEmail, summaryData.advisorEmail]);
    
    const transporter = createTransporter();
    const emailContent = createMortgageSummaryEmail(summaryData);
    
    console.log('📧 Sending email...');
    const result = await transporter.sendMail(emailContent);
    console.log('✅ Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      recipients: [summaryData.clientEmail, summaryData.advisorEmail]
    };
  } catch (error) {
    console.error('❌ Error sending mortgage summary email:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recipients: [summaryData.clientEmail, summaryData.advisorEmail]
    };
  }
};

// Send multiple invitation emails
export const sendBulkInvitationEmails = async (meetingData: {
  title: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  meetingLink: string;
  guestEmails: string[];
}) => {
  const results = [];
  
  for (const guestEmail of meetingData.guestEmails) {
    const result = await sendInvitationEmail({
      ...meetingData,
      guestEmail
    });
    results.push(result);
  }
  
  return results;
};

// Send summary email to multiple recipients
export const sendSummaryEmail = async (
  toEmails: string[],
  subject: string,
  htmlContent: string
) => {
  try {
    const transporter = createTransporter();
    
    const result = await transporter.sendMail({
      from: `"WISMeet" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: toEmails.join(', '),
      subject,
      html: htmlContent
    });
    
    return {
      success: true,
      messageId: result.messageId,
      recipients: toEmails
    };
  } catch (error) {
    console.error('Error sending summary email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recipients: toEmails
    };
  }
};

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
    console.log('🔍 Verifying email configuration...');
    console.log('🔍 Environment variables:', {
      EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com (default)',
      EMAIL_PORT: process.env.EMAIL_PORT || '587 (default)',
      EMAIL_USER: process.env.EMAIL_USER ? '***configured***' : '❌ NOT CONFIGURED',
      EMAIL_PASS: process.env.EMAIL_PASS ? '***configured***' : '❌ NOT CONFIGURED',
      EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || '❌ NOT CONFIGURED'
    });
    
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration verified successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Test function for mortgage summary email
export const testMortgageSummaryEmail = async () => {
  const testSummaryData = {
    clientName: 'John Smith',
    advisorName: 'Sarah Johnson',
    meetingDate: new Date(),
    summary: 'Discussed mortgage options for a $350,000 home purchase with 20% down payment. Client has good credit score of 720 and qualifies for 6.5% APR on a 30-year fixed-rate mortgage.',
    keyPoints: [
      'Home purchase price: $350,000',
      'Down payment: $70,000 (20%)',
      'Credit score: 720',
      'Loan type: 30-year fixed-rate',
      'Interest rate: 6.5% APR',
      'Monthly payment: $1,770 (P&I)'
    ],
    actionItems: [
      'Provide W-2s from past 2 years',
      'Submit recent pay stubs',
      'Provide bank statements (last 3 months)',
      'Complete loan application',
      'Schedule credit check'
    ],
    nextSteps: [
      'Submit all required documentation within 7 days',
      'Complete loan application by end of week',
      'Follow up on credit check results',
      'Schedule closing within 30-45 days'
    ],
    meetingType: 'Mortgage Consultation',
    clientEmail: 'john.smith@example.com',
    advisorEmail: 'sarah.johnson@mortgagecompany.com'
  };

  return await sendMortgageSummaryEmail(testSummaryData);
}; 