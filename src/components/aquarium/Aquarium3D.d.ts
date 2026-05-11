// Type declaration for platform-resolved component.
// Metro picks Aquarium3D.native.tsx on iOS/Android and Aquarium3D.web.tsx on web.
import { ComponentType } from 'react';

interface Aquarium3DProps {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  fishCount?: number;
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
}

declare const Aquarium3D: ComponentType<Aquarium3DProps>;
export default Aquarium3D;
