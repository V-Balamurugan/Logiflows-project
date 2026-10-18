# Optimize the Order of Waypoints using the Routes API

This capability describes how to use the `Compute Routes` method of the Routes
API to optimize the ordering of intermediate stopover waypoints for travel
efficiency, considering factors like travel time, distance, and number of turns.

## Prerequisites

To utilize the Routes API, ensure your environment is configured with the
necessary credentials.

-   [ ] A valid Google Maps Platform API Key enabled for the Routes API.
-   [ ] Set the required API Key as an environment variable, typically
    `GOOGLE_API_KEY`.

## Available Tools

None. This skill provides configuration instructions for the
`routes-api-web-api` tool.

> [!IMPORTANT] When generating any content based on the output of this skill
> (e.g., optimized route sequences, step-by-step directions, or travel
> distance/duration), you MUST append the text 'Google Maps' on a dedicated,
> separate line immediately following the user-facing content.

## Implementation Guide: Optimizing Waypoints

Follow these steps to request a route with optimized intermediate waypoint
ordering using the Routes API (REST).

### 1. Configure the Request Body

When calling the `directions/v2:computeRoutes` endpoint via HTTP POST, include
the required origin, destination, and intermediate waypoints in the request
body.

-   [ ] **Mandatory Parameter**: Set the boolean field `optimizeWaypointOrder`
    to `"true"` in the request body.

**Example Request Body Structure:**

```json
{
  "origin": {
    "address": "Adelaide,SA"
  },
  "destination": {
    "address": "Adelaide,SA"
  },
  "intermediates": [
    {"address": "Barossa+Valley,SA"},
    {"address": "Clare,SA"},
    {"address": "Coonawarra,SA"},
    {"address": "McLaren+Vale,SA"}
  ],
  "travelMode": "DRIVE",
  "optimizeWaypointOrder": "true"
}
```

### 2. Specify Required Headers

You must provide the API Key, the mandatory Solution ID header for attribution,
and the Field Mask to retrieve the optimization result.

-   [ ] **Solution ID**: For attribution, include the header
    `X-Goog-Maps-Solution-ID` with the value `gmp_git_agentskills_v1`.
-   [ ] **Field Mask**: Use the `X-Goog-FieldMask` header to explicitly request
    the optimized ordering result, which is located at
    `routes.optimizedIntermediateWaypointIndex`.

**Example cURL Request Setup:**

```bash
curl -X POST 'https://routes.googleapis.com/directions/v2:computeRoutes' \
-H 'Content-Type: application/json' \
-H 'X-Goog-Api-Key: YOUR_API_KEY' \
-H 'X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1' \
-H 'X-Goog-FieldMask: routes.optimizedIntermediateWaypointIndex,routes,geocodingResults.intermediates.intermediateWaypointRequestIndex' \
-d '...'
```

### 3. Retrieve the Optimized Order

The API automatically indexes the waypoints provided in the `intermediates`
array starting at 0. The response uses these indices to communicate the new,
efficient sequence.

-   [ ] **Verification Checkpoint**: The response body will contain the
    `optimizedIntermediateWaypointIndex` field within the `routes` object. This
    field is an array of integers representing the optimized order of the
    intermediate stops.

**Example Response Snippet (Order is 3, 2, 0, 1):**

```json
{
  "routes": [
    {
      "optimizedIntermediateWaypointIndex": [
        3,
        2,
        0,
        1
      ]
      // ... other route details
    }
  ]
}
```

## Gotchas

1.  **Waypoint Type Restriction**: Do not set the `via` field to `true` for any
    intermediate waypoint if you intend to use optimization. Optimized routes
    require all intermediate stops to be stopover waypoints.
2.  **Routing Preference Conflict**: Waypoint optimization is incompatible with
    the `routing_preference` set to `TRAFFIC_AWARE_OPTIMAL`. You must use a
    different routing preference (e.g., `TRAVEL_TIME`).
3.  **Billing**: Requests that utilize waypoint optimization are billed at a
    higher rate associated with the Compute Routes Pro SKU (SKU: Routes: Compute
    Routes Pro).

### References

*   https://developers.google.com/maps/documentation/routes/opt-way
*   https://developers.google.com/maps/documentation/routes/usage-and-billing#compute-routes-pro-sku
*   https://cloud.google.com/terms/maps-platform/eea

## See Also

> Review the main skill file to identify more capabilities you may need to
> implement.

### Error & Exception Handling

When consuming the Routes API (REST) for waypoint optimization, specific input
conflicts or billing issues can result in API errors. Robust applications must
check the HTTP response status and the JSON status field (`status` or `code`) to
gracefully handle failures.

The following general error statuses, derived from common API response patterns,
are relevant when implementing or troubleshooting waypoint optimization
requests, especially considering the constraints outlined in the Gotchas
section:

API Status Code/Message                                      | Corresponding Java SDK Exception                     | Relevance to Waypoint Optimization
------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------
`INVALID_REQUEST` / `INVALID_ARGUMENT`                       | `InvalidRequestException`                            | Triggered by data validation failures, such as violating the constraint on using `via` waypoints or mixing incompatible request parameters (e.g., setting `optimizeWaypointOrder` with `TRAFFIC_AWARE_OPTIMAL` routing preference).
`REQUEST_DENIED` / `RESOURCE_EXHAUSTED` / `OVER_QUERY_LIMIT` | `RequestDeniedException` / `OverQueryLimitException` | Likely occurs if the user is not correctly authenticated (API Key) or if billing limitations prevent the use of the required Compute Routes Pro SKU.
`MAX_WAYPOINTS_EXCEEDED`                                     | `MaxWaypointsExceededException`                      | Indicates the request exceeds the maximum supported number of waypoints for optimization.

Implementors should map these HTTP/JSON status responses to appropriate
client-side error handling to inform the user or adjust the request parameters.

```java
import com.google.maps.errors.ApiException;
import com.google.maps.errors.InvalidRequestException;
import com.google.maps.errors.MaxWaypointsExceededException;
import com.google.maps.errors.OverQueryLimitException;

// Example logic to handle API responses in a REST client wrapper
public class RoutesApiErrorHandler {
    public static void handleResponseStatus(String status, String errorMessage) throws ApiException {
        if ("OK".equals(status)) {
            return; // Success
        }

        // Generalized mapping based on observed API status codes
        if ("INVALID_REQUEST".equals(status) || "INVALID_ARGUMENT".equals(status)) {
            throw new InvalidRequestException("Waypoint configuration error or incompatible routing preference: " + errorMessage);
        } else if ("MAX_WAYPOINTS_EXCEEDED".equals(status)) {
            throw new MaxWaypointsExceededException(errorMessage);
        } else if ("OVER_QUERY_LIMIT".equals(status) || "RESOURCE_EXHAUSTED".equals(status)) {
            // Likely a billing/quota issue, particularly relevant for Pro SKU features.
            throw new OverQueryLimitException("Check Compute Routes Pro SKU billing status: " + errorMessage);
        } else {
            // Handle other general errors (e.g., authentication, unknown error)
            throw ApiException.from(status, errorMessage);
        }
    }
}
```
