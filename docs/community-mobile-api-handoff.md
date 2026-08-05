# Community Mobile API Handoff

Base API prefix: `{{baseUrl}} = http://localhost:3000/api/v1`

All Community endpoints require:

```http
Authorization: Bearer {{accessToken}}
```

## Route Set

```http
GET    /community/posts
GET    /community/posts/:postId
POST   /community/posts/:postId/like
PATCH  /community/posts/:postId
DELETE /community/posts/:postId
POST   /community/posts/:postId/report
GET    /community/posts/:postId/comments
POST   /community/posts/:postId/comments
GET    /community/comments/:commentId/replies
POST   /community/comments/:commentId/replies
POST   /community-creator/posts
```

The previous delete-method request on the like path has been removed. The single `POST /community/posts/:postId/like` endpoint toggles between liked and unliked state.

## Response Envelope

Success:

```json
{
  "success": true,
  "message": "Community posts fetched successfully",
  "data": [],
  "meta": null,
  "timestamp": "2026-08-01T10:00:00.000Z"
}
```

Validation and business errors use the existing backend error envelope. Ownership failures return `403`; missing or soft-deleted posts return `404`.

## Community Post Shape

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
  "location": null,
  "event": null,
  "activity": {
    "id": "6890e4caa12f9d001f1b0501",
    "title": "Morning Run",
    "type": "run",
    "startAt": "2026-08-15T06:00:00.000Z",
    "location": "Central Park",
    "hostName": "Sarah Miller",
    "hostUsername": "sarah",
    "hostProfileImageUrl": null,
    "imageUrl": null
  },
  "link": null,
  "likeCount": 10,
  "commentCount": 4,
  "isLikedByCurrentUser": true,
  "createdAt": "2026-08-01T10:00:00.000Z"
}
```

A post can include `event` or `activity`, not both.

## Comment And Reply Shape

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
  "text": "Join my event",
  "event": null,
  "activity": null,
  "isPostAuthor": false,
  "replyCount": 1,
  "replies": [],
  "createdAt": "2026-08-01T10:02:00.000Z"
}
```

`text` is optional when `eventId` or `activityId` is supplied. A comment or reply must contain `text`, `eventId`, or `activityId`.

## Feed And Detail

`GET /community/posts`

Query:

- `page`: optional, default `1`
- `limit`: optional, max `100`
- `q`: optional text search

Only non-deleted posts are returned.

`GET /community/posts/:postId`

Returns one non-deleted post. Soft-deleted posts return `404`.

## Toggle Like

`POST /community/posts/:postId/like`

No request body.

Response when the final state is liked:

```json
{
  "postId": "6890e4caa12f9d001f1b0001",
  "likeCount": 10,
  "isLikedByCurrentUser": true
}
```

Response when the final state is unliked:

```json
{
  "postId": "6890e4caa12f9d001f1b0001",
  "likeCount": 9,
  "isLikedByCurrentUser": false
}
```

The backend uses the authenticated user from the access token and returns the authoritative count.

## Create Post

`POST /community-creator/posts`

Supports JSON and multipart form-data.

Fields:

- `text`: optional, max `2000`
- `mediaIds`: optional ordered array
- `media`: optional uploaded image/video files for multipart
- `location`: optional object or JSON string
- `eventId`: optional
- `activityId`: optional
- `link`: optional URL

Rules:

- At least one content field is required.
- `eventId` and `activityId` cannot both be supplied.
- `eventId` must belong to the authenticated user as `Event.creatorId`.
- `activityId` must belong to the authenticated user as `Activity.hostId`.
- Existing `mediaIds` must belong to the authenticated user.

## Edit Post

`PATCH /community/posts/:postId`

Author-only. Omitted fields preserve current values. Explicit `null` clears nullable fields such as `text`, `location`, `eventId`, `activityId`, and `link`.

JSON example:

```json
{
  "text": "Updated post",
  "mediaIds": ["6890e4caa12f9d001f1b0201"],
  "eventId": null,
  "activityId": "6890e4caa12f9d001f1b0501"
}
```

Multipart edit uses the same Community upload limits as create. When `mediaIds` is supplied it becomes the base ordered media list; uploaded media is appended. If `mediaIds` is omitted, uploaded media is appended to the existing list.

The final post must still contain at least one content source.

## Delete Post

`DELETE /community/posts/:postId`

Author-only soft delete. The backend sets delete metadata, removes likes and comments, and keeps media, S3 objects, Event records, Activity records, and Report records. Response status is `204`.

Soft-deleted posts are excluded from feed, search, detail, like, comments, replies, edit, and report creation.

## Report Post

`POST /community/posts/:postId/report`

Body:

```json
{
  "reason": "spam",
  "details": "Optional details"
}
```

The route delegates to the existing Report module using `entityType: "community_post"`. Community reports appear in the existing Admin report list, detail, and status workflow. Duplicate active reports follow the same behavior as Event and Activity reports.

## Comments And Replies

Create comment:

```http
POST /community/posts/:postId/comments
```

Create reply:

```http
POST /community/comments/:commentId/replies
```

Valid bodies:

```json
{
  "text": "Great update"
}
```

```json
{
  "eventId": "6890e4caa12f9d001f1b0401"
}
```

```json
{
  "text": "Try this activity",
  "activityId": "6890e4caa12f9d001f1b0501"
}
```

Rules:

- `eventId` and `activityId` cannot both be supplied.
- `eventId` must belong to the authenticated user as `Event.creatorId`.
- `activityId` must belong to the authenticated user as `Activity.hostId`.
- Replies can only be created for top-level comments.

## Selection APIs

Use existing authenticated endpoints before composing posts/comments/replies:

```http
GET /users/me/hosted/events?page=1&limit=10
GET /users/me/hosted/activities?page=1&limit=10
```

These infer the current user from the token and return the user's created Events and hosted Activities.

## Breaking API Change

Mobile clients must stop calling the previous delete-method request on the like path. Use only:

```http
POST /community/posts/:postId/like
```

Read `isLikedByCurrentUser` from the response to update the local like state.
