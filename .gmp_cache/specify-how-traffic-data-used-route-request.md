# Routes API Traffic Preference Configuration

The Routes API allows developers to balance route accuracy (considering
real-time traffic) against response latency (speed) by setting the
`routingPreference` field in the request body. This preference dictates whether
current or historical traffic conditions are used for route calculation and ETA
prediction.

## Prerequisites

-   Access to the Routes API (REST/Web API).
-   A valid Google Cloud project with the Routes API enabled.
-   The global environment variable `GOOGLE_API_KEY` must be configured for the
    underlying execution environment.

## Available Tools

The primary mechanism for setting traffic preference is configuring the
`routingPreference` field within the JSON request payload sent to the Routes
API.

| Tool Name                | Capability                        | Protocol  |
| :----------------------- | :-------------------------------- | :-------- |
| Routes API REST Endpoint | Calculates routes using specified | HTTP POST |
:                          : traffic awareness.                :           :

## Configuration of Traffic Awareness

The traffic preferences are defined using the `RoutingPreference` enumeration.

### 1. Select Routing Preference

Set the `routingPreference` field in the request body to one of the following
canonical values:

| Preference              | Traffic          | Latency /      | Billing Note  |
:                         : Awareness        : Performance    :               :
| :---------------------- | :--------------- | :------------- | :------------ |
| `TRAFFIC_UNAWARE`       | None (Uses       | Lowest Latency | Standard Rate |
:                         : average,         : (Default)      :               :
:                         : time-independent :                :               :
:                         : data)            :                :               :
| `TRAFFIC_AWARE`         | Current traffic  | Moderate       | Higher Rate   |
:                         : (Performance     : Latency        : (Citation\:   :
:                         : optimized)       :                : Usage and     :
:                         :                  :                : Billing)      :
| `TRAFFIC_AWARE_OPTIMAL` | Current traffic  | Highest        | Highest Rate  |
:                         : (Exhaustive      : Latency        : (Citation\:   :
:                         : search)          :                : Usage and     :
:                         :                  :                : Billing)      :

**MANDATORY COMPLIANCE DIRECTIVE**: Requests utilizing `TRAFFIC_AWARE` and
`TRAFFIC_AWARE_OPTIMAL` are billed at a higher rate (Learn more about billing,
`https://developers.google.com/maps/documentation/routes/usage-and-billing`).

### 2. Configure `departureTime` (Optional)

For `TRAFFIC_AWARE` or `TRAFFIC_AWARE_OPTIMAL` requests, the `departureTime` can
be set to adjust how the service predicts traffic.

-   [ ] **Trigger Condition**: User specifies a future departure time (e.g.,
    "route for tomorrow at 9 AM").
-   [ ] **Verification Checkpoint**: The request payload contains both
    `routingPreference: "TRAFFIC_AWARE_OPTIMAL"` (or `TRAFFIC_AWARE`) and the
    `departureTime` field set to an appropriate timestamp.

If `departureTime` is not set for traffic-aware requests, it defaults to the
current request time. Setting a `departureTime` in the near future gives more
weight to live traffic conditions; setting it far in the future gives more
weight to historical traffic data.

> **Warning**: Using `departureTime` with `TRAFFIC_UNAWARE` is **Not
> recommended** because the route and duration calculation rely solely on
> time-independent average traffic conditions.

### 3. Analyze Response Fields

When traffic preferences are used, the response includes two distinct duration
fields:

-   `duration`: The estimated time of arrival (ETA) calculated using the
    requested traffic preference (live traffic for AWARE modes, average traffic
    for UNAWARE mode).
-   `staticDuration`: The ETA calculated considering only historical traffic
    information. For `TRAFFIC_UNAWARE`, this contains the same value as
    `duration`.

## Implementation Example (Setting Traffic Aware Optimal)

This example demonstrates how to set the `TRAFFIC_AWARE_OPTIMAL` preference in a
ComputeRoutes request body (POST payload).

```json
{
  "origin":{
    "location":{
      "latLng":{
        "latitude":37.419734,
        "longitude":-122.0827784
      }
    }
  },
  "destination":{
    "location":{
      "latLng":{
        "latitude":37.417670,
        "longitude":-122.079595
      }
    }
  },
  "travelMode":"DRIVE",
  "routingPreference":"TRAFFIC_AWARE_OPTIMAL"
}
```

When generating the HTTP request, ensure the mandatory attribution header is
included, as this is a POST request:

```http
POST https://routes.googleapis.com/v2/directions:computeRoutes?key=YOUR_API_KEY
X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1
Content-Type: application/json
...
```

## Gotchas

1.  **Latency vs. Quality Trade-off**: The `TRAFFIC_UNAWARE` option is designed
    for lowest latency and quickest response, but it uses approximate routing
    details based on historical average data, meaning routes may be calculated
    using roads that are temporarily closed.
2.  **Optimal Matrix Limits**: When utilizing `TRAFFIC_AWARE_OPTIMAL` with the
    Compute Route Matrix endpoint, be aware that the total number of elements
    (`origins` × `destinations`) in the request is limited compared to other
    preference modes. (For more details, see Compute a route matrix,
    `https://developers.google.com/maps/documentation/routes/compute_route_matrix`).
3.  **Real-World Equivalence**: The `TRAFFIC_AWARE_OPTIMAL` preference performs
    an exhaustive search equivalent to the routing logic used by maps.google.com
    and the Google Maps mobile app.

### References

-   `https://developers.google.com/maps/documentation/routes/config_trade_offs`
-   `https://developers.google.com/maps/documentation/routes/reference/rest/v2/RoutingPreference`
-   `https://developers.google.com/maps/documentation/routes/usage-and-billing`
-   `https://developers.google.com/maps/documentation/routes/compute_route_matrix`
-   `https://developers.google.com/maps/documentation/routes/reference/rpc/google.maps.routing.v2#routingpreference`

## See Also

> Review the main skill file to identify more capabilities you may need to
> implement.

### Error & Exception Handling

The Routes API, operating over REST, indicates errors using HTTP status codes
and JSON response bodies. For advanced capabilities like traffic-aware routing,
specific runtime constraints regarding input parameters and resource limits must
be addressed.

**1. Input Parameter Validation (Time and Traffic)**

When setting a traffic preference, the core logic relies on a defined departure
time. While the Routes API v2 defaults `departureTime` to `now` if unspecified
for traffic-aware requests, older API patterns strictly enforce the presence of
a departure time when requesting traffic models (analogous to
`routingPreference`). Adhering to this older validation logic can help prevent
ambiguous requests:

| Constraint      | Resulting Exception (If     | Source Context              |
:                 : enforced client-side)       :                             :
| :-------------- | :-------------------------- | :-------------------------- |
| Setting a       | `IllegalArgumentException`: | `DirectionsApiRequest.java` |
: traffic model   : Specifying a traffic model  :                             :
: without         : requires that departure     :                             :
: specifying      : time be provided.           :                             :
: `departureTime` :                             :                             :
| Specifying both | `IllegalArgumentException`: | `DirectionsApiRequest.java` |
: `departureTime` : Transit request must not    :                             :
: and             : contain both a              :                             :
: `arrivalTime`   : departureTime and an        :                             :
:                 : arrivalTime.                :                             :

```java
// Validation logic confirming that traffic features require a departure time.
// This ensures logical consistency, even if the service side may provide a default.
// Source: DirectionsApiRequest.java
@Override
protected void validateRequest() {
  // ...
  if (params().containsKey("traffic_model") && !params().containsKey("departure_time")) {
    throw new IllegalArgumentException(
        "Specifying a traffic model requires that departure time be provided.");
  }
  // ...
}
```

**2. Handling Resource Limits for Optimal Traffic Calculation**

Requests using `TRAFFIC_AWARE_OPTIMAL` perform the most intensive pathfinding
search. When integrated with the Compute Route Matrix endpoint, these complex
requests are highly susceptible to resource constraints. Errors stemming from
exceeding these limits map to standard API exceptions:

-   If the product of `origins` × `destinations` exceeds the permitted maximum
    for the `TRAFFIC_AWARE_OPTIMAL` preference (Gotcha 2: Optimal Matrix
    Limits), the API typically returns a `MAX_ELEMENTS_EXCEEDED` or
    `RESOURCE_EXHAUSTED` status code. The client library converts these statuses
    into a throwable exception such as `MaxElementsExceededException` or
    `OverQueryLimitException` (`ApiException.from`).

Implement retry logic (e.g., Exponential Backoff) for transient quota errors
(`OVER_QUERY_LIMIT` / `RESOURCE_EXHAUSTED`). For hard limits like
`MAX_ELEMENTS_EXCEEDED`, the request must be split or simplified.
