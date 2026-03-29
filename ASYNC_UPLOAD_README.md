# Async File Upload System with Symfony Messenger

This document describes the implementation of the asynchronous file upload system using Symfony Messenger.

## Overview

The system now supports:
- **Multiple file uploads**: Users can upload multiple CSV files at once
- **Asynchronous processing**: Files are processed in the background by a dedicated worker
- **Scalable architecture**: Each file becomes a separate message that can be processed independently

## Architecture

### Backend Components

#### 1. Symfony Messenger Setup
- **Configuration**: `config/packages/messenger.yaml`
- **Transport**: Doctrine (database-based queue)
- **Failed messages**: Separate failed queue for error handling

#### 2. Messages
- `CsvFileProcessingMessage`: Handles single file processing
- `MultiCsvFileProcessingMessage`: Handles multiple files by dispatching individual messages

#### 3. Message Handlers
- `CsvFileProcessingMessageHandler`: Processes individual CSV files
- `MultiCsvFileProcessingMessageHandler`: Splits multi-file uploads into individual messages

#### 4. Updated TransferImportProcessor
- Supports both single and multiple file uploads
- Stores files temporarily in `var/uploads/`
- Dispatches appropriate messages for async processing

#### 5. Docker Worker Container
- Dedicated container: `worker`
- Runs `php bin/console messenger:consume async -vv`
- Automatically restarts on failure

### Frontend Components

#### 1. TransferImport Component
- Multiple file selection with `multiple` attribute
- File list display with remove functionality
- Progress indication for async processing
- Improved user feedback

## Docker Services

### New Worker Container
```yaml
worker:
  build:
    context: ./backend
    dockerfile: docker/Dockerfile
  container_name: bank_worker
  command: php bin/console messenger:consume async -vv
  restart: unless-stopped
```

## Usage

### Single File Upload (Backward Compatible)
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('bankType', 'belfius');
```

### Multiple File Upload (New)
```javascript
const formData = new FormData();
files.forEach(file => {
  formData.append('files[]', file);
});
formData.append('bankType', 'belfius');
```

## File Processing Flow

1. **Upload**: Files are uploaded and stored temporarily
2. **Message Dispatch**: Messages are created and sent to the async queue
3. **Background Processing**: Worker consumes messages and processes files
4. **Cleanup**: Temporary files are removed after processing
5. **Error Handling**: Failed messages go to the failed queue

## Monitoring and Debugging

### View Queue Status
```bash
# Check failed messages
php bin/console messenger:failed:show

# Retry failed messages
php bin/console messenger:failed:retry

# Consume messages manually (for testing)
php bin/console messenger:consume async -vv
```

### Test the System
```bash
# Test messenger functionality
php bin/console app:test-messenger
```

## Database Schema

The messenger system creates a `messenger_messages` table with the following columns:
- `id`: Primary key
- `body`: Serialized message data
- `headers`: Message metadata
- `queue_name`: Queue identifier
- `created_at`: When message was created
- `available_at`: When message becomes available for processing
- `delivered_at`: When message was successfully delivered

## Error Handling

1. **File Validation**: Files are validated before processing
2. **Circular Reference Prevention**: Prevents invalid parent-child relationships
3. **Automatic Cleanup**: Temporary files are cleaned up on error
4. **Failed Queue**: Failed messages are preserved for retry

## Performance Considerations

- **Scalability**: Multiple worker containers can be run in parallel
- **Memory Management**: Large files are processed individually
- **Database Load**: Consider using Redis/AMQP for high-volume systems

## Migration

Run the database migration to create the messenger tables:
```bash
php bin/console doctrine:migration:migrate
```

## Future Enhancements

1. **Progress Tracking**: Add real-time progress updates
2. **WebSockets**: Real-time notifications for completion
3. **File Size Limits**: Implement configurable file size restrictions
4. **Alternative Transports**: Redis or RabbitMQ for better performance
5. **Batch Processing**: Group related files for better efficiency
