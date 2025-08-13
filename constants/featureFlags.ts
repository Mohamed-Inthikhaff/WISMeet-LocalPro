// Feature flags for media bus and participant grid improvements
export const USE_MEDIA_BUS = true;        // centralize mic & clone downstream - RE-ENABLED
export const USE_CUSTOM_GRID = false;     // explicit participant mapping - DISABLED

// Screen sharing stability flag - set to false to revert to legacy detection
export const ENABLE_STABLE_SCREENSHARE = process.env.NEXT_PUBLIC_ENABLE_STABLE_SCREENSHARE !== 'false';
