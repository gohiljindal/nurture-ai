/**
 * Mobile-local copy so Metro doesn't resolve outside app root.
 */
export type RegionalEmergencyInfo = {
  emergencyTel: "911";
  healthLineTel: string | null;
  healthLineLabel: string;
};

const DEFAULT_ONTARIO: RegionalEmergencyInfo = {
  emergencyTel: "911",
  healthLineTel: "811",
  healthLineLabel: "Health advice (811)",
};

export function getRegionalEmergencyInfo(
  province: string | null | undefined
): RegionalEmergencyInfo {
  const p = (province ?? "").trim().toUpperCase();
  switch (p) {
    case "ON":
    case "ONTARIO":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "Ontario 811" };
    case "BC":
    case "BRITISH COLUMBIA":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "BC 811" };
    case "AB":
    case "ALBERTA":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "Health Link (811)" };
    case "SK":
    case "SASKATCHEWAN":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "HealthLine (811)" };
    case "MB":
    case "MANITOBA":
      return { emergencyTel: "911", healthLineTel: "204-788-8200", healthLineLabel: "Health Links (MB)" };
    case "QC":
    case "QUÉBEC":
    case "QUEBEC":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "Info-Santé (811)" };
    case "NB":
    case "NEW BRUNSWICK":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "Tele-Care (811)" };
    case "NS":
    case "NOVA SCOTIA":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "811 NS" };
    case "PE":
    case "PRINCE EDWARD ISLAND":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "811 PEI" };
    case "NL":
    case "NEWFOUNDLAND":
    case "NEWFOUNDLAND AND LABRADOR":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "811 NL" };
    case "NT":
    case "NU":
    case "YT":
      return { emergencyTel: "911", healthLineTel: "811", healthLineLabel: "Nurse line (811)" };
    default:
      return DEFAULT_ONTARIO;
  }
}
