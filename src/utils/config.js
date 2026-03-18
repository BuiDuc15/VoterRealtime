export const NUM_SHARDS = 10;
export const PRESENCE_INTERVAL = 60000; // 60s heartbeat — tối ưu Spark quota
export const PRESENCE_TIMEOUT = 90000; // 90s = offline
export const MAX_VOTE_RETRIES = 3;
export const RETRY_BASE_DELAY = 300; // ms, exponential backoff

