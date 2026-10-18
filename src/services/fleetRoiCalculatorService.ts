/**
 * Fleet ROI Calculator & EV Transition Financial Modeling Service
 * 
 * Accurately models the financial, operational, and environmental return on investment
 * of transitioning commercial vehicle fleets from diesel to battery electric vehicles,
 * factoring in fuel cost savings, maintenance reductions, and carbon tax credits.
 */

import { FleetRoiModelInputs, FleetRoiModelOutputs, CashFlowYearPoint } from '../types';

export const DEFAULT_ROI_INPUTS: FleetRoiModelInputs = {
  convertedVehiclesCount: 8,
  dailyMileageKm: 140,
  annualOperatingDays: 280,
  dieselConsumptionL100km: 11.8,
  dieselPricePerLiter: 1.28,
  evConsumptionKWh100km: 26.5,
  electricityPricePerKWh: 0.18,
  evPurchasePremiumPerVehicle: 14000,
  chargerCostPerVehicle: 3200,
  govSubsidiesPerVehicle: 8500, // IRA 45W & Clean Vehicle Tax Incentive
  carbonCreditPricePerTon: 85,  // LCFS / Carbon Offset Credit Market
  dieselMaintCostPerKm: 0.085,
  evMaintCostPerKm: 0.038,
  discountRatePct: 6.0,
  analysisYears: 5,
};

export interface ScenarioPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  inputs: Partial<FleetRoiModelInputs>;
}

export const ROI_SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'STANDARD_BALANCED',
    name: 'Balanced Commercial Baseline',
    badge: 'Recommended',
    description: 'Current California commercial logistics corridor rates with standard Level-2 depot charging infrastructure.',
    inputs: { ...DEFAULT_ROI_INPUTS },
  },
  {
    id: 'AGGRESSIVE_DECARBONIZATION',
    name: 'Aggressive Net-Zero & High Carbon Credits',
    badge: 'High ESG Return',
    description: 'Models rising fossil fuel costs ($1.45/L diesel), high carbon tax credits ($120/Ton), and off-peak solar depot charging ($0.14/kWh).',
    inputs: {
      ...DEFAULT_ROI_INPUTS,
      dieselPricePerLiter: 1.45,
      electricityPricePerKWh: 0.14,
      carbonCreditPricePerTon: 120,
      govSubsidiesPerVehicle: 11000,
    },
  },
  {
    id: 'CONSERVATIVE_CFO',
    name: 'Conservative Audit Horizon',
    badge: 'Lowest Risk',
    description: 'Worst-case sensitivity model with conservative diesel pricing ($1.18/L), minimal carbon credit monetization ($45/Ton), and lower subsidies ($6,000).',
    inputs: {
      ...DEFAULT_ROI_INPUTS,
      dieselPricePerLiter: 1.18,
      electricityPricePerKWh: 0.22,
      carbonCreditPricePerTon: 45,
      govSubsidiesPerVehicle: 6000,
      evPurchasePremiumPerVehicle: 16000,
    },
  },
  {
    id: 'URBAN_LAST_MILE',
    name: 'Dense Urban Last-Mile Fleet',
    badge: 'High Stop Density',
    description: 'Frequent stop-and-go delivery routes with high regenerative braking recapture and maximum brake pad maintenance savings.',
    inputs: {
      ...DEFAULT_ROI_INPUTS,
      dailyMileageKm: 110,
      annualOperatingDays: 310,
      dieselConsumptionL100km: 13.5, // Stop-and-go diesel burns more fuel
      evConsumptionKWh100km: 24.0,   // High regen efficiency in city
      dieselMaintCostPerKm: 0.105,   // Frequent brake pad wear on diesel
      evMaintCostPerKm: 0.032,
    },
  },
];

class FleetRoiCalculatorService {
  /**
   * Computes the complete ROI model outputs based on parametric inputs
   */
  public calculateRoi(inputs: FleetRoiModelInputs): FleetRoiModelOutputs {
    const {
      convertedVehiclesCount,
      dailyMileageKm,
      annualOperatingDays,
      dieselConsumptionL100km,
      dieselPricePerLiter,
      evConsumptionKWh100km,
      electricityPricePerKWh,
      evPurchasePremiumPerVehicle,
      chargerCostPerVehicle,
      govSubsidiesPerVehicle,
      carbonCreditPricePerTon,
      dieselMaintCostPerKm,
      evMaintCostPerKm,
      discountRatePct,
      analysisYears,
    } = inputs;

    // 1. Annual Mileage
    const annualKmPerVehicle = dailyMileageKm * annualOperatingDays;
    const totalFleetAnnualKm = annualKmPerVehicle * convertedVehiclesCount;

    // 2. Fuel & Electricity Volumes
    const annualDieselLiters = (totalFleetAnnualKm / 100) * dieselConsumptionL100km;
    const annualElectricityKWh = (totalFleetAnnualKm / 100) * evConsumptionKWh100km;

    // 3. Energy Costs & Savings
    const annualDieselCost = annualDieselLiters * dieselPricePerLiter;
    const annualElectricityCost = annualElectricityKWh * electricityPricePerKWh;
    const annualFuelSavingsUsd = Math.round(annualDieselCost - annualElectricityCost);

    // 4. Carbon Emissions & Abatement
    // Diesel: 2.68 kg CO2/L | Clean Grid EV: 0.14 kg CO2/kWh
    const annualDieselCo2Kg = annualDieselLiters * 2.68;
    const annualEvCo2Kg = annualElectricityKWh * 0.14;
    const annualCo2AbatedKg = Math.max(0, annualDieselCo2Kg - annualEvCo2Kg);
    const annualCo2AbatedMetricTons = +(annualCo2AbatedKg / 1000).toFixed(1);
    const fiveYearCo2AbatedMetricTons = +(annualCo2AbatedMetricTons * 5).toFixed(1);

    // 5. Carbon Tax Credit Monetization Revenue
    const annualCarbonCreditRevenueUsd = Math.round(annualCo2AbatedMetricTons * carbonCreditPricePerTon);

    // 6. Maintenance Savings
    const annualDieselMaintCost = totalFleetAnnualKm * dieselMaintCostPerKm;
    const annualEvMaintCost = totalFleetAnnualKm * evMaintCostPerKm;
    const annualMaintenanceSavingsUsd = Math.round(annualDieselMaintCost - annualEvMaintCost);

    // 7. Total Annual Net Operating Savings
    const annualNetOperatingSavingsUsd =
      annualFuelSavingsUsd + annualMaintenanceSavingsUsd + annualCarbonCreditRevenueUsd;

    // 8. Capital Expenditures (CapEx)
    const netCapExPerVehicle = evPurchasePremiumPerVehicle + chargerCostPerVehicle - govSubsidiesPerVehicle;
    const totalInitialNetCapExUsd = Math.max(1000, Math.round(netCapExPerVehicle * convertedVehiclesCount));

    // 9. Payback Period
    const paybackPeriodYears = +(totalInitialNetCapExUsd / annualNetOperatingSavingsUsd).toFixed(2);

    // 10. Cash Flow Timeline & Net Present Value (NPV)
    const discountRate = discountRatePct / 100;
    let cumulativeCashFlow = -totalInitialNetCapExUsd;
    let npv = -totalInitialNetCapExUsd;

    const cashFlowTimeline: CashFlowYearPoint[] = [
      {
        year: 0,
        label: 'Year 0 (CapEx)',
        annualCashFlow: -totalInitialNetCapExUsd,
        cumulativeCashFlow: -totalInitialNetCapExUsd,
        dieselTco: 0,
        evTco: totalInitialNetCapExUsd,
        fuelSavings: 0,
        maintSavings: 0,
        carbonCredits: 0,
      },
    ];

    let cumDieselTco = 0;
    let cumEvTco = totalInitialNetCapExUsd;

    for (let yr = 1; yr <= analysisYears; yr++) {
      cumulativeCashFlow += annualNetOperatingSavingsUsd;
      npv += annualNetOperatingSavingsUsd / Math.pow(1 + discountRate, yr);

      cumDieselTco += (annualDieselCost + annualDieselMaintCost);
      cumEvTco += (annualElectricityCost + annualEvMaintCost - annualCarbonCreditRevenueUsd);

      cashFlowTimeline.push({
        year: yr,
        label: `Year ${yr}`,
        annualCashFlow: annualNetOperatingSavingsUsd,
        cumulativeCashFlow: Math.round(cumulativeCashFlow),
        dieselTco: Math.round(cumDieselTco),
        evTco: Math.round(cumEvTco),
        fuelSavings: annualFuelSavingsUsd,
        maintSavings: annualMaintenanceSavingsUsd,
        carbonCredits: annualCarbonCreditRevenueUsd,
      });
    }

    const fiveYearNetSavingsUsd = Math.round(cumulativeCashFlow);
    const fiveYearNpvUsd = Math.round(npv);
    const fiveYearRoiPct = Math.round((fiveYearNetSavingsUsd / totalInitialNetCapExUsd) * 100);

    // 11. TCO 5-Year Comparison
    const diesel5YearTco = Math.round((annualDieselCost + annualDieselMaintCost) * 5);
    const ev5YearTco = Math.round(
      totalInitialNetCapExUsd +
        (annualElectricityCost + annualEvMaintCost - annualCarbonCreditRevenueUsd) * 5
    );
    const tcoSavingsUsd = Math.max(0, diesel5YearTco - ev5YearTco);
    const tcoSavingsPct = +( (tcoSavingsUsd / (diesel5YearTco || 1)) * 100 ).toFixed(1);

    return {
      annualFuelSavingsUsd,
      annualMaintenanceSavingsUsd,
      annualCarbonCreditRevenueUsd,
      annualNetOperatingSavingsUsd,
      totalInitialNetCapExUsd,
      paybackPeriodYears,
      fiveYearNetSavingsUsd,
      fiveYearNpvUsd,
      fiveYearRoiPct,
      annualCo2AbatedMetricTons,
      fiveYearCo2AbatedMetricTons,
      cashFlowTimeline,
      tcoComparison: {
        diesel5YearTco,
        ev5YearTco,
        tcoSavingsUsd,
        tcoSavingsPct,
      },
    };
  }

  /**
   * Generates formatted CSV for financial modeling download
   */
  public generateCsv(inputs: FleetRoiModelInputs, outputs: FleetRoiModelOutputs): string {
    const lines = [
      'LogiFlows Commercial Fleet EV ROI Financial Model',
      `Analysis Date,${new Date().toISOString().slice(0, 10)}`,
      '',
      '--- MODEL ASSUMPTIONS & PARAMETERS ---',
      `Converted Vehicles Count,${inputs.convertedVehiclesCount}`,
      `Daily Mileage per Vehicle (km),${inputs.dailyMileageKm}`,
      `Operating Days per Year,${inputs.annualOperatingDays}`,
      `Baseline Diesel Consumption (L/100km),${inputs.dieselConsumptionL100km}`,
      `Diesel Price per Liter ($),${inputs.dieselPricePerLiter}`,
      `EV Electricity Consumption (kWh/100km),${inputs.evConsumptionKWh100km}`,
      `Electricity Price per kWh ($),${inputs.electricityPricePerKWh}`,
      `EV Purchase Premium per Vehicle ($),${inputs.evPurchasePremiumPerVehicle}`,
      `Charger Infrastructure per Vehicle ($),${inputs.chargerCostPerVehicle}`,
      `Government Clean Vehicle Subsidies per Vehicle ($),${inputs.govSubsidiesPerVehicle}`,
      `Carbon Tax Credit Price ($/Metric Ton),${inputs.carbonCreditPricePerTon}`,
      `Diesel Maintenance Cost ($/km),${inputs.dieselMaintCostPerKm}`,
      `EV Maintenance Cost ($/km),${inputs.evMaintCostPerKm}`,
      `Discount Rate (%),${inputs.discountRatePct}%`,
      '',
      '--- EXECUTIVE FINANCIAL RESULTS ---',
      `Annual Fuel Cost Savings ($),${outputs.annualFuelSavingsUsd}`,
      `Annual Maintenance Savings ($),${outputs.annualMaintenanceSavingsUsd}`,
      `Annual Carbon Tax Credit Revenue ($),${outputs.annualCarbonCreditRevenueUsd}`,
      `Total Annual Net Operating Savings ($),${outputs.annualNetOperatingSavingsUsd}`,
      `Initial Net Capital Investment ($),${outputs.totalInitialNetCapExUsd}`,
      `Simple Payback Period (Years),${outputs.paybackPeriodYears}`,
      `5-Year Cumulative Net Savings ($),${outputs.fiveYearNetSavingsUsd}`,
      `5-Year Net Present Value (NPV) ($),${outputs.fiveYearNpvUsd}`,
      `5-Year ROI (%),${outputs.fiveYearRoiPct}%`,
      `Annual CO2 Abated (Metric Tons),${outputs.annualCo2AbatedMetricTons}`,
      `5-Year CO2 Abated (Metric Tons),${outputs.fiveYearCo2AbatedMetricTons}`,
      '',
      '--- 5-YEAR CASH FLOW TIMELINE ---',
      'Timeline Period,Annual Cash Flow ($),Cumulative Net Cash Flow ($),Diesel TCO ($),EV TCO ($)',
      ...outputs.cashFlowTimeline.map(
        (c) => `"${c.label}",${c.annualCashFlow},${c.cumulativeCashFlow},${c.dieselTco},${c.evTco}`
      ),
    ];
    return lines.join('\n');
  }

  /**
   * Generates executive board summary text
   */
  public generateExecutiveSummaryText(
    inputs: FleetRoiModelInputs,
    outputs: FleetRoiModelOutputs
  ): string {
    const divider = '================================================================================';
    return `${divider}
EXECUTIVE FINANCIAL BRIEFING: COMMERCIAL FLEET ELECTRIFICATION ROI
Confidential • Prepared for Operations, Fleet Management & CFO
${divider}

1. EXECUTIVE OVERVIEW:
Transitioning ${inputs.convertedVehiclesCount} commercial vehicles from internal combustion diesel to battery-electric delivery vans delivers an annual operational savings of $${outputs.annualNetOperatingSavingsUsd.toLocaleString()} and a 5-year Net Present Value (NPV) of $${outputs.fiveYearNpvUsd.toLocaleString()} at a ${inputs.discountRatePct}% cost of capital.

2. INVESTMENT & CAPITAL DEPLOYMENT:
  • Gross EV Acquisition Delta:    $${(inputs.evPurchasePremiumPerVehicle * inputs.convertedVehiclesCount).toLocaleString()}
  • Depot Charging Infrastructure: $${(inputs.chargerCostPerVehicle * inputs.convertedVehiclesCount).toLocaleString()}
  • Clean Vehicle Tax Subsidies:  -$${(inputs.govSubsidiesPerVehicle * inputs.convertedVehiclesCount).toLocaleString()} (IRA Section 45W / State Grants)
  • NET INITIAL CAPITAL OUTLAY:    $${outputs.totalInitialNetCapExUsd.toLocaleString()}

3. ANNUAL CASH INFLOWS & SAVINGS:
  • Fuel Cost Savings:             $${outputs.annualFuelSavingsUsd.toLocaleString()}/year (Electricity vs $${inputs.dieselPricePerLiter}/L Diesel)
  • Reduced Maintenance:           $${outputs.annualMaintenanceSavingsUsd.toLocaleString()}/year (Regen braking, zero oil changes)
  • Carbon Tax Credits Monetized:  $${outputs.annualCarbonCreditRevenueUsd.toLocaleString()}/year (${outputs.annualCo2AbatedMetricTons} Tons CO₂ @ $${inputs.carbonCreditPricePerTon}/Ton)
  • TOTAL ANNUAL NET BENEFIT:      $${outputs.annualNetOperatingSavingsUsd.toLocaleString()}/year

4. FINANCIAL RETURN METRICS:
  • Simple Payback Period:         ${outputs.paybackPeriodYears} Years (${Math.round(outputs.paybackPeriodYears * 12)} Months)
  • 5-Year Cumulative Net Profit:  $${outputs.fiveYearNetSavingsUsd.toLocaleString()}
  • 5-Year Return on Investment:   ${outputs.fiveYearRoiPct}% ROI
  • 5-Year TCO Cost Reduction:     ${outputs.tcoComparison.tcoSavingsPct}% savings vs status quo diesel fleet

5. ENVIRONMENTAL & ESG IMPACT:
  • Annual CO₂ Emissions Abated:   ${outputs.annualCo2AbatedMetricTons} Metric Tons CO₂/year
  • 5-Year Cumulative Abatement:   ${outputs.fiveYearCo2AbatedMetricTons} Metric Tons CO₂
${divider}`;
  }
}

export const fleetRoiCalculatorService = new FleetRoiCalculatorService();
