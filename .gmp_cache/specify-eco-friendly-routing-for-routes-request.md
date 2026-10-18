The Routes API allows agents to calculate routes optimized for reduced fuel or
energy consumption based on the vehicle's engine type and real-time conditions.
This functionality returns the most fuel/energy-efficient path alongside the
default route.

This feature is currently in Preview (Pre-GA Offerings).

### Prerequisites and Constraints

To utilize Eco-Friendly Routing (Feature: Eco-friendly Routing) or estimate fuel
consumption, the following constraints **must** be met:

1.  The request must use the
    `https://routes.googleapis.com/directions/v2:computeRoutes` endpoint.
2.  The `travelMode` must be set to `DRIVE` or `TWO_WHEELER`.
3.  The request cannot contain any intermediate waypoints.
4.  The origin waypoint must be located in a
    [Supported region](#supported-regions).
5.  **Mandatory Routing Preference:** The `routingPreference` **must** be set to
    `TRAFFIC_AWARE_OPTIMAL`. This setting triggers a more exhaustive search for
    the optimal route (Section: Prerequisites).

#### Billing Mandate

Because Eco-friendly routing requires setting the `routingPreference` to
`TRAFFIC_AWARE_OPTIMAL`, this capability is charged based on the **SKU: Compute
Routes Pro** (Section: Billing).

### Available Tools

| Tool Name                   | Description                                  |
| :-------------------------- | :------------------------------------------- |
| `routes_api_compute_routes` | Computes a route between two locations using |
:                             : the specified modifiers, including           :
:                             : eco-friendly parameters.                     :

### 1. Requesting an Eco-Friendly Route

Follow this checklist to request an eco-friendly route optimized for fuel
efficiency.

-   [ ] **Configure Routing Preference:** Set the request body field
    `routingPreference` to `"TRAFFIC_AWARE_OPTIMAL"`.
    *   **Trigger Condition:** User requests fuel-efficient route or provides
        vehicle details.
    *   **Verification Checkpoint:** The output includes both `DEFAULT_ROUTE`
        and `FUEL_EFFICIENT` labels in the response (or a single route with both
        labels if they are identical).
-   [ ] **Specify Vehicle Type:** Set the
    `routeModifiers.vehicleInfo.emissionType` based on the user's vehicle type.
    Use one of the canonical values defined in `VehicleEmissionType`:
    *   `DIESEL`
    *   `GASOLINE` (Default if unspecified)
    *   `ELECTRIC`
    *   `HYBRID`
-   [ ] **Request Efficient Route:** Set the request body field
    `requestedReferenceRoutes` to `["FUEL_EFFICIENT"]`.
-   [ ] **Specify Field Mask:** Ensure the `X-Goog-FieldMask` HTTP header
    includes `routes.routeLabels` and `routes.routeToken` to retrieve the
    relevant information for both the default and eco-friendly routes.

#### Example Eco-Friendly Request

This example computes the default route and the fuel-efficient route for a
`GASOLINE` vehicle.

```text
curl -X POST 'https://routes.googleapis.com/directions/v2:computeRoutes' \
-H 'Content-Type: application/json' \
-H 'X-Goog-Api-Key: YOUR_API_KEY' \
-H 'X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1' \
-H 'X-Goog-FieldMask: routes.distanceMeters,routes.duration,routes.routeLabels,routes.routeToken' \
-d '{
  "origin": {
    "location": {
      "latLng": {
        "latitude": 41.76904801292959,
        "longitude": -72.67374935684933
      }
    }
  },
  "destination": {
    "location": {
      "latLng": {
        "latitude": 41.823042361105024,
        "longitude": -71.40933143059424
      }
    }
  },
  "routeModifiers": {
    "vehicleInfo": {
      "emissionType": "GASOLINE"
    }
  },
  "travelMode":"DRIVE",
  "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
  "requestedReferenceRoutes": ["FUEL_EFFICIENT"]
}'
```

#### Example Eco-Friendly Response Snippet

The response returns two routes identified by `routeLabels`:

```json
{
    "routes": [
        {
            "distanceMeters": 138939,
            "duration": "5412s",
            "routeToken": "CoYJCpoIC…0n9S1cu",
            "routeLabels": [
                "DEFAULT_ROUTE"
            ]
        },
        {
            "distanceMeters": 116887,
            "duration": "5631s",
            "routeToken": "CuEHCu0G…xqm",
            "routeLabels": [
                "FUEL_EFFICIENT"
            ]
        }
    ]
}
```

### 2. Estimating Fuel Usage

The agent can also request the estimated fuel consumption for any route
(including the default route, eco-friendly route, or alternatives), returned in
microliters.

-   [ ] **Enable Fuel Consumption Calculation:** Add `"FUEL_CONSUMPTION"` to the
    `extraComputations` array field in the request body.
    *   **Trigger Condition:** User asks for comparative fuel usage or energy
        consumption metrics between routes.
    *   **Verification Checkpoint:** The response JSON includes the
        `routes.travelAdvisory.fuelConsumptionMicroliters` field for each route
        object.
-   [ ] **Specify Vehicle Type:** Set the
    `routeModifiers.vehicleInfo.emissionType` (required for accurate
    calculation, even if not requesting the `FUEL_EFFICIENT` route). Note that
    for `ELECTRIC` and `HYBRID` types, the energy/electricity consumption is
    converted and expressed in microliters of fuel.
-   [ ] **Specify Field Mask:** Ensure the `X-Goog-FieldMask` HTTP header
    includes `routes.travelAdvisory.fuelConsumptionMicroliters`.

#### Example Request with Fuel Consumption

This request includes both the eco-friendly route request and the fuel
consumption computation.

```text
curl -X POST 'https://routes.googleapis.com/directions/v2:computeRoutes' \
-H 'Content-Type: application/json' \
-H 'X-Goog-Api-Key: YOUR_API_KEY' \
-H 'X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1' \
-H 'X-Goog-FieldMask: routes.distanceMeters,routes.duration,routes.routeLabels,routes.routeToken,routes.travelAdvisory.fuelConsumptionMicroliters' \
-d '{
  "origin": {
    "location": {
      "latLng": {
        "latitude": 41.76904801292959,
        "longitude": -72.67374935684933
      }
    }
  },
  "destination": {
    "location": {
      "latLng": {
        "latitude": 41.823042361105024,
        "longitude": -71.40933143059424
      }
    }
  },
  "routeModifiers": {
    "vehicleInfo": {
      "emissionType": "GASOLINE"
    }
  },
  "travelMode":"DRIVE",
  "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
  "extraComputations": ["FUEL_CONSUMPTION"],
  "requestedReferenceRoutes": ["FUEL_EFFICIENT"]
}'
```

#### Example Fuel Consumption Response Snippet

The response shows the `fuelConsumptionMicroliters` for each route.

```json
{
    "routes": [
        {
            "distanceMeters": 138939,
            "duration": "5412s",
            "travelAdvisory": {
                "fuelConsumptionMicroliters": "11019554"
            },
            "routeToken": "CoYJCpoIC…0n9S1cu",
            "routeLabels": [
                "DEFAULT_ROUTE"
            ]
        },
        {
            "distanceMeters": 116887,
            "duration": "5631s",
            "travelAdvisory": {
                "fuelConsumptionMicroliters": "9572436"
            },
            "routeToken": "CuEHCu0G…xqm",
            "routeLabels": [
                "FUEL_EFFICIENT"
            ]
        }
    ]
}
```

### Supported Regions

Eco-friendly routing is only available when the origin waypoint is located in
one of the following countries (Section: Supported regions): Albania (AL),
Australia (AU), Austria (AT), Belgium (BE), Bosnia and Herzegovina (BA),
Bulgaria (BG), Canada (CA), Croatia (HR), Cyprus (CY), Czechia (CZ), Denmark
(DK), Egypt (EG), Estonia (EE), Finland (FI), France (FR), Germany (DE), Greece
(GR), Hungary (HU), Iceland (IS), India (IN), Indonesia (ID), Ireland (IE),
Italy (IT), Kosovo (XK), Latvia (LV), Liechtenstein (LI), Lithuania (LT),
Luxembourg (LU), Malta (MT), Mexico (MX), Montenegro (ME), Netherlands (NL),
North Macedonia (MK), Norway (NO), Poland (PL), Portugal (PT), Romania (RO),
Saudi Arabia (SA), Serbia (RS), Slovakia (SK), Slovenia (SI), Spain (ES), Sweden
(SE), Switzerland (CH), Turkey (TR), United Arab Emirates (AE), United Kingdom
(GB), United States (US).

For two-wheelers (`TWO_WHEELER`), eco-friendly routing is only supported in
India (IN) and Indonesia (ID) (Section: Two-wheeler supported regions).

### Gotchas

*   **Compute Route Matrix:** Eco-friendly routes are explicitly **not
    supported** by the Compute Route Matrix feature of the Routes API (Note).
*   **Pricing Tier:** Requesting eco-friendly routes always requires
    `TRAFFIC_AWARE_OPTIMAL` and thus results in billing under the **Compute
    Routes Pro** SKU.
*   **Preview Status:** This feature is in Preview (pre-GA) and changes might
    not be compatible with other pre-GA versions. Pre-GA Offerings are covered
    by the
    [Google Maps Platform Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_campaign=gmp_git_agentskills_v1).
*   **EEA Terms:** If the billing address is in the European Economic Area, the
    [Google Maps Platform EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea?utm_campaign=gmp_git_agentskills_v1)
    apply effective 8 July 2025 (Section: EEA developers).

### References

*   [Configure quality vs latency](https://developers.google.com/maps/documentation/routes/config_trade_offs?utm_campaign=gmp_git_agentskills_v1)
*   [Google Maps Platform EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea?utm_campaign=gmp_git_agentskills_v1)
*   [Google Maps Platform Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_campaign=gmp_git_agentskills_v1)
*   [Request an eco-friendly route](https://developers.google.com/maps/documentation/routes/eco-routes?utm_campaign=gmp_git_agentskills_v1)
*   [Routes API Billing and Usage](https://developers.google.com/maps/documentation/routes/usage-and-billing?utm_campaign=gmp_git_agentskills_v1)
*   [VehicleEmissionType Reference](https://developers.google.com/maps/documentation/routes/reference/rest/v2/RouteModifiers?utm_campaign=gmp_git_agentskills_v1#vehicleemissiontype)
*   [Read more about eco-friendly routing technology (PDF)](https://www.gstatic.com/gumdrop/sustainability/google-maps-eco-friendly-routing.pdf?utm_campaign=gmp_git_agentskills_v1)
*   [SKU: Compute Routes Pro](https://developers.google.com/maps/documentation/routes/usage-and-billing?utm_campaign=gmp_git_agentskills_v1#compute-routes-pro-sku)

## See Also

> Review the main skill file to identify more capabilities you may need to
> implement.
