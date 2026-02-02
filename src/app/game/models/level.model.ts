export interface LevelBlueprint {
    id: string;
    difficulty: number; // 1-10
    parkingType: 'straight' | 'reverse' | 'angled' | 'parallel';
    areaSize: number; // meters (width of parking space)
    timeLimit: number; // seconds
    obstacleCount: number;
    angleTolerance: number; // degrees ±
    environmentTheme: 'parking_lot' | 'street' | 'garage' | 'mall';
    handcrafted: boolean;
}

export interface ParkingZone {
    position: { x: number; y: number; z: number };
    rotation: number; // Y-axis rotation in radians
    size: { width: number; length: number };
}
