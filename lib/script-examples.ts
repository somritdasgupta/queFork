export const SCRIPT_EXAMPLES = [
  {
    title: "Headers Management",
    code: `// Set a single header
qf(request).header('Content-Type', 'application/json');

// Chain multiple header operations
qf(request)
  .header('Authorization', 'Bearer token123')
  .header('Accept', 'application/json')
  .header('X-Custom', 'value');

// Remove a header
qf(request).header('X-Custom');

// Clear all headers
qf(request).clear('header');`,
  },
  {
    title: "Query Parameters",
    code: `// Set query parameters
qf(request)
  .query('page', '1')
  .query('limit', '10')
  .query('sort', 'desc');

// Remove a query parameter
qf(request).query('sort');

// Clear all query parameters
qf(request).clear('query');`,
  },
  {
    title: "Authentication",
    code: `// Set Bearer token auth
qf(request).auth('bearer', { token: 'your-token' });

// Set Basic auth
qf(request).auth('basic', { 
  username: 'user',
  password: 'pass'
});

// Set API Key auth
qf(request).auth('apiKey', {
  key: 'your-api-key',
  headerName: 'X-API-Key'
});

// Remove auth
qf(request).auth('none');`,
  },
  {
    title: "Body Content",
    code: `// Set JSON body
qf(request).body('application/json', {
  key: 'value',
  nested: { data: true }
});

// Set form data
qf(request).body('multipart/form-data', [
  { key: 'field1', value: 'value1' },
  { key: 'field2', value: 'value2' }
]);

// Clear body
qf(request).clear('body');`,
  },
  {
    title: "Environment Variables",
    code: `// Set environment variables
qf(request)
  .env('API_URL', 'https://api.example.com')
  .env('API_KEY', 'your-key');

// Clear environment variables
qf(request).clear('env');`,
  },
  {
    title: "Complex Example",
    code: `// Complete request setup
qf(request)
  .clear('header')  // Clear existing headers
  .header('Content-Type', 'application/json')
  .header('Accept', 'application/json')
  .auth('bearer', { token: env.API_TOKEN })
  .query('version', '2')
  .body('application/json', {
    data: { 
      id: 123,
      status: 'active'
    }
  });`,
  },
  {
    title: "Advanced Header Management",
    code: `// Find indices of headers with the same name
const contentTypeIndices = qf(request).findHeaderIndices('Content-Type');
console.log('Content-Type headers at indices:', contentTypeIndices);

// Update specific header at index 0 (first one)
qf(request).header('Content-Type', 'application/xml', 0);

// Remove specific header at index 1 (second one)
qf(request).header('Accept', undefined, 1);

// Add multiple headers with same name
qf(request)
  .header('X-Custom', 'value1')
  .header('X-Custom', 'value2');

// Get all indices
const customIndices = qf(request).findHeaderIndices('X-Custom');
console.log('Custom headers at indices:', customIndices);`,
  },
  {
    title: "Advanced Query Parameter Management",
    code: `// Find indices of query parameters with same name
const pageIndices = qf(request).findQueryIndices('page');
console.log('Page params at indices:', pageIndices);

// Update specific query at index
qf(request).query('page', '10', 0); 

// Remove specific query at index
qf(request).query('sort', undefined, 1);

// Add multiple query parameters with same name
qf(request)
  .query('filter', 'name:asc')
  .query('filter', 'age:desc');

// Find all indices of the filter parameter
const filterIndices = qf(request).findQueryIndices('filter');
console.log('Filter params at indices:', filterIndices);`,
  },
];
