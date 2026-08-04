# Community Mobile API Handoff

Base API prefix: `{{baseUrl}} = http://localhost:3000/api/v1`

This handoff is based on the currently implemented Community backend only. It documents the real request validation, response envelope, authentication behavior, pagination metadata, upload constraints, and error shapes exposed by:

- `src/modules/community/*`
- `src/modules/community-creator/*`
- `src/middlewares/auth.middleware.ts`
- `src/middlewares/error-handler.middleware.ts`
- `src/utils/response.utils.ts`

## Response Envelope

Successful responses use this envelope:

```json
{
  "success": true,
  "message": "Community posts fetched successfully",
  "data": [],
  "meta": null,
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

Paginated responses use:

```json
{
  "success": true,
  "message": "Community posts fetched successfully",
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0
  },
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

Validation errors use:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "meta": null,
  "errors": [
    {
      "field": "params.postId",
      "message": "Invalid ObjectId",
      "code": "custom"
    }
  ],
  "errorCode": "VALIDATION_ERROR",
  "requestId": "req_123",
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

App errors use:

```json
{
  "success": false,
  "message": "Community post not found",
  "data": null,
  "meta": null,
  "errorCode": "RESOURCE_NOT_FOUND",
  "requestId": "req_123",
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

## Authentication

Community endpoints are protected by `authMiddleware.verifyToken`.

Required header:

```http
Authorization: Bearer {{accessToken}}
```

Bearer format:

```text
Bearer eyJhbGciOi...
```

How auth works in the implemented backend:

- Login returns `accessToken` in the JSON response body.
- Login also sets a secure `httpOnly` cookie named `refreshToken`.
- Community endpoints only require the access token.
- `/auth/token/refresh` reads the refresh token from either:
  - `req.body.refreshToken`
  - cookie `refreshToken`

Mobile storage guidance based on the actual backend:

- Store `accessToken` in secure device storage such as iOS Keychain or Android Keystore.
- Send `Authorization: Bearer {{accessToken}}` on every Community request.
- If mobile needs silent token refresh, the client must preserve the backend-issued `refreshToken` cookie or coordinate a refresh strategy with the auth flow, because login does not return `refreshToken` in JSON.

Unauthorized response format for missing or invalid bearer token:

```json
{
  "success": false,
  "message": "Invalid email or password.",
  "data": null,
  "meta": null,
  "errorCode": "AUTH_TOKEN_NOT_FOUND",
  "requestId": "req_123",
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

All endpoints in this document require authentication:

- `GET /community/posts`
- `GET /community/posts/:postId`
- `POST /community/posts/:postId/like`
- `DELETE /community/posts/:postId/like`
- `GET /community/posts/:postId/comments`
- `POST /community/posts/:postId/comments`
- `GET /community/comments/:commentId/replies`
- `POST /community/comments/:commentId/replies`
- `POST /community-creator/posts`

## Data Shapes

### Community Post

```json
{
  "id": "6890e4caa12f9d001f1b0001",
  "author": {
    "id": "6890e4caa12f9d001f1b0101",
    "name": "Sarah Miller",
    "username": "sarah",
    "avatarUrl": "https://example.com/avatar.jpg"
  },
  "text": "Morning training update",
  "media": [
    {
      "id": "6890e4caa12f9d001f1b0201",
      "type": "IMAGE",
      "url": "https://example.com/photo.jpg",
      "thumbnailUrl": null,
      "order": 0
    }
  ],
  "location": {
    "label": "Central Park",
    "coordinates": {
      "type": "Point",
      "coordinates": [-73.968285, 40.785091]
    }
  },
  "event": {
    "id": "6890e4caa12f9d001f1b0401",
    "title": "Community Run",
    "type": "run",
    "startAt": "2026-08-15T06:00:00.000Z",
    "location": "Central Park",
    "creatorName": "Sarah Miller",
    "creatorUsername": "sarah",
    "creatorProfileImageUrl": "https://example.com/avatar.jpg",
    "imageUrl": "https://example.com/event.jpg"
  },
  "link": "https://example.com",
  "likeCount": 10,
  "commentCount": 4,
  "isLikedByCurrentUser": true,
  "createdAt": "2026-08-01T10:00:00.000Z"
}
```

### Community Comment / Reply

```json
{
  "id": "6890e4caa12f9d001f1b0301",
  "postId": "6890e4caa12f9d001f1b0001",
  "parentCommentId": null,
  "author": {
    "id": "6890e4caa12f9d001f1b0102",
    "name": "Elena Ross",
    "username": "elena",
    "avatarUrl": null
  },
  "text": "Great update",
  "isPostAuthor": false,
  "replyCount": 1,
  "replies": [],
  "createdAt": "2026-08-01T10:02:00.000Z"
}
```

## Feed API

### `GET /community/posts`

Purpose: fetch the main Community feed.

Method: `GET`

URL: `{{baseUrl}}/community/posts`

Headers:

- `Authorization: Bearer {{accessToken}}`

Authentication: required

Query parameters:

- `page`: number, optional, minimum `1`, default `1`
- `limit`: number, optional, minimum `1`, maximum `100`, default `10`
- `q`: string, optional, max length `200`

Implemented behavior:

- Sorting order is newest first: `createdAt DESC`
- Search is case-insensitive and applies to post `text` only
- Pagination is page-based, not cursor-based
- Empty feed returns `success: true` with `data: []`
- `meta.totalPages` can be `0` when there are no results

Infinite scrolling guidance:

1. Start with `page=1`.
2. Append returned `data`.
3. Request the next page while `meta.page < meta.totalPages`.
4. Stop when `meta.page >= meta.totalPages`.

Complete response example:

```json
{
  "success": true,
  "message": "Community posts fetched successfully",
  "data": [
    {
      "id": "6890e4caa12f9d001f1b0001",
      "author": {
        "id": "6890e4caa12f9d001f1b0101",
        "name": "Sarah Miller",
        "username": "sarah",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "text": "Morning training update",
      "media": [
        {
          "id": "6890e4caa12f9d001f1b0201",
          "type": "IMAGE",
          "url": "https://example.com/photo.jpg",
          "thumbnailUrl": null,
          "order": 0
        }
      ],
      "location": null,
      "event": null,
      "link": null,
      "likeCount": 10,
      "commentCount": 4,
      "isLikedByCurrentUser": true,
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  },
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

Example request:

```bash
curl --request GET \
  --url '{{baseUrl}}/community/posts?page=1&limit=10&q=training' \
  --header 'Authorization: Bearer {{accessToken}}'
```

Possible errors:

- `400 Validation failed`
- `401 Invalid email or password.`

## Endpoint Reference

### `GET /community/posts`

Purpose: list community posts for the authenticated user.

Method: `GET`

URL: `{{baseUrl}}/community/posts`

Headers:

- `Authorization: Bearer {{accessToken}}`

Authentication: required

Parameters:

- Query `page`
- Query `limit`
- Query `q`

Request body: none

Example response:

```json
{
  "success": true,
  "message": "Community posts fetched successfully",
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0
  },
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

Possible errors:

- `400 Validation failed`
- `401 Invalid email or password.`

### `GET /community/posts/:postId`

Purpose: fetch a single post with the canonical Community post payload.

Method: `GET`

URL: `{{baseUrl}}/community/posts/{{postId}}`

Headers:

- `Authorization: Bearer {{accessToken}}`

Authentication: required

Parameters:

- Path `postId`: valid Mongo ObjectId

Request body: none

Example request:

```bash
curl --request GET \
  --url '{{baseUrl}}/community/posts/{{postId}}' \
  --header 'Authorization: Bearer {{accessToken}}'
```

Example response:

```json
{
  "success": true,
  "message": "Community post fetched successfully",
  "data": {
    "id": "6890e4caa12f9d001f1b0001",
    "author": {
      "id": "6890e4caa12f9d001f1b0101",
      "name": "Sarah Miller",
      "username": "sarah",
      "avatarUrl": "https://example.com/avatar.jpg"
    },
    "text": "Morning training update",
    "media": [],
    "location": null,
    "event": null,
    "link": "https://example.com",
    "likeCount": 10,
    "commentCount": 4,
    "isLikedByCurrentUser": true,
    "createdAt": "2026-08-01T10:00:00.000Z"
  },
  "meta": null,
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

Possible errors:

- `400 Validation failed`
- `401 Invalid email or password.`
- `404 Community post not found`

### `POST /community/posts/:postId/like`

Purpose: like a post.

Method: `POST`

URL: `{{baseUrl}}/community/posts/{{postId}}/like`

Headers:

- `Authorization: Bearer {{accessToken}}`

Authentication: required

Parameters:

- Path `postId`: valid Mongo ObjectId

Request body: none

Behavior notes:

- Idempotent from a client perspective
- Repeating the like still returns `200`

Example response:

```json
{
  "success": true,
  "message": "Community post liked successfully",
  "data": {
    "postId": "6890e4caa12f9d001f1b0001",
    "likeCount": 10,
    "isLikedByCurrentUser": true
  },
  "meta": null,
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

Possible errors:

- `400 Validation failed`
- `401 Invalid email or password.`
- `404 Community post not found`

### `DELETE /community/posts/:postId/like`

Purpose: unlike a post.

Method: `DELETE`

URL: `{{baseUrl}}/community/posts/{{postId}}/like`

Headers:

- `Authorization: Bearer {{accessToken}}`

Authentication: required

Parameters:

- Path `postId`: valid Mongo ObjectId

Request body: none

Behavior notes:

- Idempotent from a client perspective
- Repeating the unlike still returns `200`

Example response:

```json
{
  "success": true,
  "message": "Community post unliked successfully",
  "data": {
    "postId": "6890e4caa12f9d001f1b0001",
    "likeCount": 9,
    "isLikedByCurrentUser": false
  },
  "meta": null,
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

Possible errors:

- `400 Validation failed`
- `401 Invalid email or password.`
- `404 Community post not found`

### `GET /community/posts/:postId/comments`

Purpose: list top-level comments for a post.

Method: `GET`

URL: `{{baseUrl}}/community/posts/{{postId}}/comments`

Headers:

- `Authorization: Bearer {{accessToken}}`

Authentication: required

Parameters:

- Path `postId`: valid Mongo ObjectId
- Query `page`: minimum `1`, default `1`
- Query `limit`: minimum `1`, maximum `100`, default `10`

Request body: none

Implemented behavior:

- Returns top-level comments only
- Sorted oldest first: `createdAt ASC`
- Each comment includes `replyCount`
- Each top-level comment includes at most one preview reply in `replies`
- If `replyCount > replies.length`, mobile should call the replies endpoint to load the full thread

Example response:

```json
{
  "success": true,
  "message": "Community comments fetched successfully",
  "data": [
    {
      "id": "6890e4caa12f9d001f1b0301",
      "postId": "6890e4caa12f9d001f1b0001",
      "parentCommentId": null,
      "author": {
        "id": "6890e4caa12f9d001f1b0102",
        "name": "Elena Ross",
        "username": "elena",
        "avatarUrl": null
      },
      "text": "Great update",
      "isPostAuthor": false,
      "replyCount": 1,
      "replies": [
        {
          "id": "6890e4caa12f9d001f1b0302",
          "postId": "6890e4caa12f9d001f1b0001",
          "parentCommentId": "6890e4caa12f9d001f1b0301",
          "author": {
            "id": "6890e4caa12f9d001f1b0101",
            "name": "Sarah Miller",
            "username": "sarah",
            "avatarUrl": "https://example.com/avatar.jpg"
          },
          "text": "Thank you",
          "isPostAuthor": true,
          "replyCount": 0,
          "replies": [],
          "createdAt": "2026-08-01T10:05:00.000Z"
        }
      ],
      "createdAt": "2026-08-01T10:02:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  },
  "timestamp": "2026-08-01T10:06:00.000Z"
}
```

Possible errors:

- `400 Validation failed`
- `401 Invalid email or password.`
- `404 Community post not found`

### `POST /community/posts/:postId/comments`

Purpose: create a top-level comment on a post.

Method: `POST`

URL: `{{baseUrl}}/community/posts/{{postId}}/comments`

Headers:

- `Authorization: Bearer {{accessToken}}`
- `Content-Type: application/json`

Authentication: required

Parameters:

- Path `postId`: valid Mongo ObjectId

Request body:

```json
{
  "text": "Great update"
}
```

Validation:

- `text` is required
- `text` is trimmed
- min length `1`
- max length `4000`

Example response:

```json
{
  "success": true,
  "message": "Community comment created successfully",
  "data": {
    "id": "6890e4caa12f9d001f1b0301",
    "postId": "6890e4caa12f9d001f1b0001",
    "parentCommentId": null,
    "author": {
      "id": "6890e4caa12f9d001f1b0102",
      "name": "Elena Ross",
      "username": "elena",
      "avatarUrl": null
    },
    "text": "Great update",
    "isPostAuthor": false,
    "replyCount": 0,
    "replies": [],
    "createdAt": "2026-08-01T10:02:00.000Z"
  },
  "meta": null,
  "timestamp": "2026-08-01T10:02:00.000Z"
}
```

Possible errors:

- `400 Validation failed`
- `401 Invalid email or password.`
- `404 Community post not found`

### `GET /community/comments/:commentId/replies`

Purpose: list replies for one top-level comment.

Method: `GET`

URL: `{{baseUrl}}/community/comments/{{commentId}}/replies`

Headers:

- `Authorization: Bearer {{accessToken}}`

Authentication: required

Parameters:

- Path `commentId`: valid Mongo ObjectId
- Query `page`: minimum `1`, default `1`
- Query `limit`: minimum `1`, maximum `100`, default `10`

Request body: none

Implemented behavior:

- Sorted oldest first: `createdAt ASC`
- Works only for top-level comments

Example response:

```json
{
  "success": true,
  "message": "Community replies fetched successfully",
  "data": [
    {
      "id": "6890e4caa12f9d001f1b0302",
      "postId": "6890e4caa12f9d001f1b0001",
      "parentCommentId": "6890e4caa12f9d001f1b0301",
      "author": {
        "id": "6890e4caa12f9d001f1b0101",
        "name": "Sarah Miller",
        "username": "sarah",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "text": "Thank you",
      "isPostAuthor": true,
      "replyCount": 0,
      "replies": [],
      "createdAt": "2026-08-01T10:05:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  },
  "timestamp": "2026-08-01T10:06:00.000Z"
}
```

Possible errors:

- `400 Validation failed`
- `400 Replies can only be listed for top-level comments`
- `401 Invalid email or password.`
- `404 Community comment not found`
- `404 Community post not found`

### `POST /community/comments/:commentId/replies`

Purpose: create a reply for a top-level comment.

Method: `POST`

URL: `{{baseUrl}}/community/comments/{{commentId}}/replies`

Headers:

- `Authorization: Bearer {{accessToken}}`
- `Content-Type: application/json`

Authentication: required

Parameters:

- Path `commentId`: valid Mongo ObjectId

Request body:

```json
{
  "text": "Thank you"
}
```

Validation:

- `text` is required
- `text` is trimmed
- min length `1`
- max length `4000`

Example response:

```json
{
  "success": true,
  "message": "Community reply created successfully",
  "data": {
    "id": "6890e4caa12f9d001f1b0302",
    "postId": "6890e4caa12f9d001f1b0001",
    "parentCommentId": "6890e4caa12f9d001f1b0301",
    "author": {
      "id": "6890e4caa12f9d001f1b0101",
      "name": "Sarah Miller",
      "username": "sarah",
      "avatarUrl": "https://example.com/avatar.jpg"
    },
    "text": "Thank you",
    "isPostAuthor": true,
    "replyCount": 0,
    "replies": [],
    "createdAt": "2026-08-01T10:05:00.000Z"
  },
  "meta": null,
  "timestamp": "2026-08-01T10:05:00.000Z"
}
```

Possible errors:

- `400 Validation failed`
- `400 Replying to a reply is not supported`
- `401 Invalid email or password.`
- `404 Community comment not found`
- `404 Community post not found`

### `POST /community-creator/posts`

Purpose: create a community post using text, existing media IDs, uploaded media, location, event, and/or link.

Method: `POST`

URL: `{{baseUrl}}/community-creator/posts`

Headers:

- `Authorization: Bearer {{accessToken}}`
- `Content-Type: multipart/form-data` for uploads
- `Content-Type: application/json` for non-file create flows

Authentication: required

Parameters: none

Request body options:

#### Multipart form-data

Supported fields:

- `text`: optional string, max `2000`
- `mediaIds`: optional JSON string array or repeated string value
- `location`: optional JSON string object
- `location[label]`: optional string
- `location[latitude]`: optional numeric value between `-90` and `90`
- `location[longitude]`: optional numeric value between `-180` and `180`
- `eventId`: optional valid ObjectId
- `link`: optional valid URL
- `media`: optional binary file, repeat up to `10` files

Example multipart fields:

```text
text=Morning training update
mediaIds=["6890e4caa12f9d001f1b0201"]
location[label]=Central Park
location[latitude]=40.785091
location[longitude]=-73.968285
eventId=6890e4caa12f9d001f1b0401
link=https://example.com
media=@photo.jpg
media=@clip.mp4
```

#### JSON

```json
{
  "text": "Morning training update",
  "mediaIds": ["6890e4caa12f9d001f1b0201"],
  "location": {
    "label": "Central Park",
    "latitude": 40.785091,
    "longitude": -73.968285
  },
  "eventId": "6890e4caa12f9d001f1b0401",
  "link": "https://example.com"
}
```

Implemented validation and behavior:

- At least one content field must be present after normalization:
  - `text`
  - `mediaIds`
  - uploaded `media`
  - `location`
  - `eventId`
  - `link`
- `mediaIds` must be valid ObjectIds
- `eventId` must be a valid ObjectId
- `location` must contain valid numeric coordinates in range
- `link` must be a valid URL
- Uploaded files:
  - max `10` files
  - max `50 MB` per file
  - allowed MIME prefixes: `image/` and `video/`
- Existing media must belong to the authenticated user
- Existing media types must be `image` or `video`

Example request:

```bash
curl --request POST \
  --url '{{baseUrl}}/community-creator/posts' \
  --header 'Authorization: Bearer {{accessToken}}' \
  --form 'text=Morning training update' \
  --form 'location[label]=Central Park' \
  --form 'location[latitude]=40.785091' \
  --form 'location[longitude]=-73.968285' \
  --form 'media=@./photo.jpg'
```

Example response:

```json
{
  "success": true,
  "message": "Community post created successfully",
  "data": {
    "id": "6890e4caa12f9d001f1b0001",
    "author": {
      "id": "6890e4caa12f9d001f1b0101",
      "name": "Sarah Miller",
      "username": "sarah",
      "avatarUrl": "https://example.com/avatar.jpg"
    },
    "text": "Morning training update",
    "media": [
      {
        "id": "6890e4caa12f9d001f1b0201",
        "type": "IMAGE",
        "url": "https://example.com/photo.jpg",
        "thumbnailUrl": null,
        "order": 0
      }
    ],
    "location": {
      "label": "Central Park",
      "coordinates": {
        "type": "Point",
        "coordinates": [-73.968285, 40.785091]
      }
    },
    "event": null,
    "link": null,
    "likeCount": 0,
    "commentCount": 0,
    "isLikedByCurrentUser": false,
    "createdAt": "2026-08-01T10:00:00.000Z"
  },
  "meta": null,
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

Possible errors:

- `400 Validation failed`
- `400 Community post must include at least one content field`
- `400 Only image and video uploads are supported`
- `400 A maximum of 10 files is allowed`
- `400 File size exceeds the allowed 50 MB limit`
- `401 Invalid email or password.`
- `403 You do not have access to this media`
- `404 Media not found`
- `404 Event not found`

## Frontend Integration Notes

- `isLikedByCurrentUser` is already resolved by the backend for the authenticated user.
- `author.username` is derived from the populated user email prefix.
- `media[].thumbnailUrl` is currently always `null`.
- Comment and reply ordering is oldest first.
- The comments endpoint is optimized to include only one preview reply per parent comment.
- For a full reply thread, always follow up with `GET /community/comments/:commentId/replies`.
- Invalid `postId`, `commentId`, `eventId`, and `mediaIds` are rejected as normal validation errors before Mongo casting.

## Deliverables

- Markdown handoff: `docs/community-mobile-api-handoff.md`
- Postman collection: `postman/stoneacademy-community.postman_collection.json`
