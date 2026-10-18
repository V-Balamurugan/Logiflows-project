import { Parcel, VehicleType } from '../types';

export type WeatherConditionType = 
  | 'CLEAR'
  | 'LIGHT_RAIN'
  | 'HEAVY_DOWNPOUR'
  | 'DENSE_FOG'
  | 'GALE_STORM'
  | 'ICE_FREEZE';

export interface WeatherStation {
  id: string;
  name: string;
  region: string;
  corridor: string;
  lat: number;
  lng: number;
  condition: WeatherConditionType;
  conditionLabel: string;
  temperatureC: number;
  precipitationMmPerHour: number;
  windSpeedKmh: number;
  windGustKmh: number;
  visibilityKm: number;
  humidityPercent: number;
  roadFrictionCoeff: number; // 0.20 (slippery) to 0.90 (dry clean)
  standingWaterMm: number;
  severeAlert: string | null;
  lastUpdated: string;
}

export interface WeatherDelayImpact {
  predictiveDelayScore: number; // 0 - 100
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  estimatedSpeedReductionPct: number; // e.g. 15%
  additionalDelayMinutesPerTrip: number; // standard transit leg delay
  brakingDistanceMultiplier: number;
  visibilityPenaltyScore: number;
  adverseRiskFactors: string[];
  operationalRecommendation: string;
}

export interface WeatherAdjustedParcelRecord {
  parcelId: string;
  trackingNumber: string;
  recipientCity: string;
  assignedCourierName?: string;
  assignedVehicleType?: VehicleType;
  baselineEta: string;
  weatherAdjustedEta: string;
  additionalDelayMinutes: number;
  predictiveDelayScore: number;
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  weatherStationUsed: string;
  primaryHazard: string;
}

export const INITIAL_WEATHER_STATIONS: WeatherStation[] = [
  {
    id: 'ws-sf-port',
    name: 'San Francisco Embarcadero & Port',
    region: 'San Francisco Peninsula',
    corridor: 'I-80 / Bay Bridge West Approach',
    lat: 37.795,
    lng: -122.394,
    condition: 'HEAVY_DOWNPOUR',
    conditionLabel: 'Atmospheric River Storm',
    temperatureC: 13.5,
    precipitationMmPerHour: 18.4,
    windSpeedKmh: 42.0,
    windGustKmh: 64.0,
    visibilityKm: 1.8,
    humidityPercent: 94,
    roadFrictionCoeff: 0.42,
    standingWaterMm: 6.2,
    severeAlert: 'Flash Flood Watch & Bridge Crosswind Warning (>40mph gusts)',
    lastUpdated: 'Just now',
  },
  {
    id: 'ws-silicon-valley',
    name: 'Silicon Valley Expressway Station',
    region: 'South Bay Tech Hub',
    corridor: 'US-101 South / CA-85',
    lat: 37.412,
    lng: -122.072,
    condition: 'LIGHT_RAIN',
    conditionLabel: 'Intermittent Showers',
    temperatureC: 15.0,
    precipitationMmPerHour: 3.5,
    windSpeedKmh: 18.0,
    windGustKmh: 28.0,
    visibilityKm: 6.5,
    humidityPercent: 82,
    roadFrictionCoeff: 0.65,
    standingWaterMm: 1.2,
    severeAlert: null,
    lastUpdated: '1 min ago',
  },
  {
    id: 'ws-east-bay-port',
    name: 'Oakland Intermodal Freight Corridor',
    region: 'East Bay Logistics Port',
    corridor: 'I-880 Freight Arterial / CA-24',
    lat: 37.804,
    lng: -122.271,
    condition: 'DENSE_FOG',
    conditionLabel: 'Marine Advection Fog Bank',
    temperatureC: 11.8,
    precipitationMmPerHour: 0.2,
    windSpeedKmh: 12.0,
    windGustKmh: 16.0,
    visibilityKm: 0.4,
    humidityPercent: 99,
    roadFrictionCoeff: 0.68,
    standingWaterMm: 0.0,
    severeAlert: 'Dense Fog Advisory (<0.25 mile visibility on highway overpasses)',
    lastUpdated: '2 mins ago',
  },
  {
    id: 'ws-north-bay-marin',
    name: 'Marin Highway 101 Ridge Station',
    region: 'North Bay Corridor',
    corridor: 'US-101 North / Golden Gate',
    lat: 37.871,
    lng: -122.508,
    condition: 'GALE_STORM',
    conditionLabel: 'High Wind & Coastal Gale',
    temperatureC: 12.2,
    precipitationMmPerHour: 9.8,
    windSpeedKmh: 58.0,
    windGustKmh: 82.0,
    visibilityKm: 3.0,
    humidityPercent: 91,
    roadFrictionCoeff: 0.48,
    standingWaterMm: 4.0,
    severeAlert: 'High Wind Warning: Commercial cargo e-bikes and empty high-cube vans restricted',
    lastUpdated: 'Just now',
  },
  {
    id: 'ws-central-valley',
    name: 'Tri-Valley Regional Hub Station',
    region: 'Pleasanton / Livermore Transit',
    corridor: 'I-580 East / I-680 Interchange',
    lat: 37.662,
    lng: -121.874,
    condition: 'CLEAR',
    conditionLabel: 'Dry & Clear Skies',
    temperatureC: 18.2,
    precipitationMmPerHour: 0.0,
    windSpeedKmh: 9.0,
    windGustKmh: 14.0,
    visibilityKm: 16.0,
    humidityPercent: 48,
    roadFrictionCoeff: 0.88,
    standingWaterMm: 0.0,
    severeAlert: null,
    lastUpdated: '3 mins ago',
  },
];

class MockWeatherService {
  private stations: WeatherStation[] = [...INITIAL_WEATHER_STATIONS];
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Weather listener error:', err);
      }
    });
  }

  /**
   * Mock API: Returns all monitored regional weather stations
   */
  public async getRegionalWeather(): Promise<WeatherStation[]> {
    // Simulate real-time async REST network fetch
    await new Promise((res) => setTimeout(res, 80));
    return [...this.stations];
  }

  public getStationById(id: string): WeatherStation | undefined {
    return this.stations.find((s) => s.id === id);
  }

  /**
   * Calculate Predictive Delay Score and weather factors based on meteorological observations
   */
  public calculateWeatherDelayScore(
    station: WeatherStation,
    vehicleType?: VehicleType
  ): WeatherDelayImpact {
    let score = 0;
    const adverseFactors: string[] = [];

    // 1. Precipitation & Road Wetness
    if (station.precipitationMmPerHour > 15) {
      score += 38;
      adverseFactors.push(`Torrential downpour (${station.precipitationMmPerHour.toFixed(1)} mm/h) with standing road water`);
    } else if (station.precipitationMmPerHour > 5) {
      score += 22;
      adverseFactors.push(`Active heavy rainfall (${station.precipitationMmPerHour.toFixed(1)} mm/h) reducing vehicle traction`);
    } else if (station.precipitationMmPerHour > 0.5) {
      score += 10;
      adverseFactors.push('Light damp road surface; slight lane braking buffer added');
    }

    // 2. Wind Speed & Gusts
    if (station.windGustKmh > 70) {
      score += 32;
      adverseFactors.push(`Hazardous gusts (${station.windGustKmh.toFixed(0)} km/h) impacting commercial vehicle stability`);
    } else if (station.windGustKmh > 45) {
      score += 18;
      adverseFactors.push(`Elevated crosswinds (${station.windGustKmh.toFixed(0)} km/h) on bridge spans`);
    }

    // 3. Visibility Obstruction (Fog / Spray)
    if (station.visibilityKm < 0.5) {
      score += 26;
      adverseFactors.push(`Severe visibility restriction (<0.5 km) requiring reduced cruising velocity`);
    } else if (station.visibilityKm < 2.0) {
      score += 14;
      adverseFactors.push(`Reduced visibility (${station.visibilityKm.toFixed(1)} km) causing merging queue deceleration`);
    }

    // 4. Road Friction Degradation
    if (station.roadFrictionCoeff < 0.45) {
      score += 15;
      adverseFactors.push(`Low friction coefficient (${station.roadFrictionCoeff.toFixed(2)}) increases stop distances by 60%`);
    }

    // 5. Vehicle Type Modifiers
    if (vehicleType === 'CARGO_EBIKE') {
      if (station.windGustKmh > 35 || station.precipitationMmPerHour > 8) {
        score += 20;
        adverseFactors.push('Cargo E-Bike high vulnerability to severe rain and bridge winds');
      }
    } else if (vehicleType === 'HEAVY_HAUL') {
      if (station.windGustKmh > 60) {
        score += 15;
        adverseFactors.push('High-profile trailer subject to wind gust tipping restrictions');
      }
    }

    // Clamp score to [0, 100]
    const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

    // Categorize Risk Tier
    let riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    let speedReductionPct = 0;
    let delayMinutes = 0;
    let recommendation = 'Nominal driving conditions. Regular dispatched ETA holds.';

    if (clampedScore >= 75) {
      riskTier = 'CRITICAL';
      speedReductionPct = 45;
      delayMinutes = 35;
      recommendation = 'Hold high-cube vans from bridge routes. Apply emergency 35-min SLA padding and notify recipients.';
    } else if (clampedScore >= 50) {
      riskTier = 'HIGH';
      speedReductionPct = 30;
      delayMinutes = 22;
      recommendation = 'Enforce safe following distances. Reroute via low-elevation expressways; pad ETA by ~20 minutes.';
    } else if (clampedScore >= 25) {
      riskTier = 'MODERATE';
      speedReductionPct = 15;
      delayMinutes = 10;
      recommendation = 'Moderate wet weather slowdown. Dispatch route adjustments and add 10-min arrival cushion.';
    } else {
      riskTier = 'LOW';
      speedReductionPct = 5;
      delayMinutes = 2;
      recommendation = 'Clear roads. Routine telemetry and SLA on target.';
    }

    return {
      predictiveDelayScore: clampedScore,
      riskTier,
      estimatedSpeedReductionPct: speedReductionPct,
      additionalDelayMinutesPerTrip: delayMinutes,
      brakingDistanceMultiplier: +(1.0 + (0.90 - station.roadFrictionCoeff) * 1.5).toFixed(2),
      visibilityPenaltyScore: +(Math.max(0, (10 - station.visibilityKm) * 5)).toFixed(0),
      adverseRiskFactors: adverseFactors.length > 0 ? adverseFactors : ['Optimal surface and visibility conditions'],
      operationalRecommendation: recommendation,
    };
  }

  /**
   * Correlate parcels in transit with active weather stations to produce weather-adjusted ETAs
   */
  public calculateWeatherAdjustedParcels(
    parcels: Parcel[],
    stationOverride?: WeatherStation
  ): WeatherAdjustedParcelRecord[] {
    const activeStation = stationOverride || this.stations[0];

    return parcels.map((parcel) => {
      // Find matching weather station based on recipient city or use primary active station
      const city = parcel.recipient.city.toLowerCase();
      let matchedStation = activeStation;

      if (!stationOverride) {
        if (city.includes('francisco')) {
          matchedStation = this.stations.find((s) => s.id === 'ws-sf-port') || activeStation;
        } else if (city.includes('oakland') || city.includes('berkeley')) {
          matchedStation = this.stations.find((s) => s.id === 'ws-east-bay-port') || activeStation;
        } else if (city.includes('san jose') || city.includes('sunnyvale') || city.includes('palo alto')) {
          matchedStation = this.stations.find((s) => s.id === 'ws-silicon-valley') || activeStation;
        } else if (city.includes('san rafael') || city.includes('sausalito')) {
          matchedStation = this.stations.find((s) => s.id === 'ws-north-bay-marin') || activeStation;
        }
      }

      const impact = this.calculateWeatherDelayScore(matchedStation);
      
      // Calculate adjusted ETA string
      const baselineDate = new Date(parcel.estimatedDeliveryDate);
      const isDateValid = !isNaN(baselineDate.getTime());
      const baseTime = isDateValid ? baselineDate.getTime() : Date.now() + 2 * 60 * 60 * 1000;
      
      const adjustedTimestamp = new Date(baseTime + impact.additionalDelayMinutesPerTrip * 60 * 1000);
      
      const formatTime = (d: Date) => {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };

      return {
        parcelId: parcel.id,
        trackingNumber: parcel.trackingNumber,
        recipientCity: parcel.recipient.city,
        assignedCourierName: parcel.assignedCourierId ? 'Marcus Vance' : 'Unassigned Pool',
        assignedVehicleType: 'ELECTRIC_VAN',
        baselineEta: isDateValid ? formatTime(baselineDate) : '14:30',
        weatherAdjustedEta: formatTime(adjustedTimestamp),
        additionalDelayMinutes: impact.additionalDelayMinutesPerTrip,
        predictiveDelayScore: impact.predictiveDelayScore,
        riskTier: impact.riskTier,
        weatherStationUsed: matchedStation.name,
        primaryHazard: impact.adverseRiskFactors[0] || 'Nominal road conditions',
      };
    });
  }

  /**
   * Simulate a regional weather shift or disaster scenario for stress-testing
   */
  public updateStationCondition(stationId: string, newCondition: WeatherConditionType) {
    this.stations = this.stations.map((st) => {
      if (st.id !== stationId) return st;

      switch (newCondition) {
        case 'CLEAR':
          return {
            ...st,
            condition: 'CLEAR',
            conditionLabel: 'Dry & Clear Skies',
            precipitationMmPerHour: 0.0,
            roadFrictionCoeff: 0.88,
            standingWaterMm: 0.0,
            visibilityKm: 15.0,
            windSpeedKmh: 10.0,
            windGustKmh: 14.0,
            severeAlert: null,
            lastUpdated: 'Just now (Simulated)',
          };
        case 'LIGHT_RAIN':
          return {
            ...st,
            condition: 'LIGHT_RAIN',
            conditionLabel: 'Intermittent Showers',
            precipitationMmPerHour: 3.2,
            roadFrictionCoeff: 0.65,
            standingWaterMm: 1.0,
            visibilityKm: 7.0,
            windSpeedKmh: 20.0,
            windGustKmh: 30.0,
            severeAlert: null,
            lastUpdated: 'Just now (Simulated)',
          };
        case 'HEAVY_DOWNPOUR':
          return {
            ...st,
            condition: 'HEAVY_DOWNPOUR',
            conditionLabel: 'Atmospheric River Storm',
            precipitationMmPerHour: 22.5,
            roadFrictionCoeff: 0.38,
            standingWaterMm: 8.5,
            visibilityKm: 1.5,
            windSpeedKmh: 48.0,
            windGustKmh: 72.0,
            severeAlert: 'Flash Flood Watch & Arterial Hydroplaning Hazard',
            lastUpdated: 'Just now (Simulated)',
          };
        case 'DENSE_FOG':
          return {
            ...st,
            condition: 'DENSE_FOG',
            conditionLabel: 'Marine Advection Fog Bank',
            precipitationMmPerHour: 0.3,
            roadFrictionCoeff: 0.66,
            standingWaterMm: 0.0,
            visibilityKm: 0.3,
            windSpeedKmh: 8.0,
            windGustKmh: 12.0,
            severeAlert: 'Severe Fog Advisory (<0.25 mile visibility on highway overpasses)',
            lastUpdated: 'Just now (Simulated)',
          };
        case 'GALE_STORM':
          return {
            ...st,
            condition: 'GALE_STORM',
            conditionLabel: 'Severe Gale Wind & Storm',
            precipitationMmPerHour: 14.0,
            roadFrictionCoeff: 0.42,
            standingWaterMm: 5.0,
            visibilityKm: 2.2,
            windSpeedKmh: 65.0,
            windGustKmh: 92.0,
            severeAlert: 'High Wind Warning: Structural bridge buffeting (>55mph sustained)',
            lastUpdated: 'Just now (Simulated)',
          };
        case 'ICE_FREEZE':
          return {
            ...st,
            condition: 'ICE_FREEZE',
            conditionLabel: 'Sub-Zero Freeze & Black Ice',
            temperatureC: -1.5,
            precipitationMmPerHour: 1.0,
            roadFrictionCoeff: 0.22,
            standingWaterMm: 2.0,
            visibilityKm: 5.0,
            windSpeedKmh: 25.0,
            windGustKmh: 38.0,
            severeAlert: 'Black Ice Hazard on elevated freeway overpasses and ramps',
            lastUpdated: 'Just now (Simulated)',
          };
        default:
          return st;
      }
    });

    this.notify();
  }

  /**
   * Reset all stations to default observations
   */
  public resetToDefault() {
    this.stations = [...INITIAL_WEATHER_STATIONS];
    this.notify();
  }
}

export const mockWeatherService = new MockWeatherService();
