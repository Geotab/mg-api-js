export type VehicleDetails = {
    vin: string;
    make: string;
    model: string;
    year: string;
    vehicleType: string;
    manufacturer: string;
    company: string;
    country: string;
    plant: string;
    gvw: string;
    brakes: string;
    seatbelts: string;
    airbags: string;
    engine: string;
    driveline: string;
    body: string;
    error: string;
};

export type DecodeVinResponse = {
    result: Array<VehicleDetails>;
    jsonrpc: string;
};