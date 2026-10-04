import { assertPreviewDatabaseIsolation } from './preview-database-isolation.js';

// Reject a preview function at module load before it can use shared credentials.
assertPreviewDatabaseIsolation();
