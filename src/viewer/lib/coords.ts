import * as THREE from 'three';

// Unity LH(Y-up) → three RH(Y-up) 확정 변환 = flipX. 위치·회전 모두 대합(involution)이라
// three→Unity 역변환은 같은 함수 재적용. (검증: hanadream_web main.js 좌표 라이브토글 결과)
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export const flipPos = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];
export const flipQuat = (q: Quat): Quat => [q[0], -q[1], -q[2], q[3]];

export interface UnityTransform {
  posX: number; posY: number; posZ: number;
  rotX: number; rotY: number; rotZ: number; // 오일러(도), 순서 YXZ
  scaleX: number; scaleY: number; scaleZ: number;
}

// Unity 서버 transform → three 객체에 적용
export function applyUnityToObject(obj: THREE.Object3D, t: UnityTransform): void {
  const fp = flipPos([t.posX, t.posY, t.posZ]);
  const uq = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(t.rotX),
      THREE.MathUtils.degToRad(t.rotY),
      THREE.MathUtils.degToRad(t.rotZ),
      'YXZ',
    ),
  );
  const fq = flipQuat([uq.x, uq.y, uq.z, uq.w]);
  obj.position.set(fp[0], fp[1], fp[2]);
  obj.quaternion.set(fq[0], fq[1], fq[2], fq[3]);
  obj.scale.set(t.scaleX, t.scaleY, t.scaleZ);
}

// three 객체 현재 TRS → Unity 서버값 (역변환). flipPos/flipQuat 대합이라 재적용.
export function unityFromObject(obj: THREE.Object3D): UnityTransform {
  const p = flipPos([obj.position.x, obj.position.y, obj.position.z]);
  const fq = flipQuat([obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w]);
  const e = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion(fq[0], fq[1], fq[2], fq[3]),
    'YXZ',
  );
  const r = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
  return {
    posX: r(p[0]), posY: r(p[1]), posZ: r(p[2]),
    rotX: r(THREE.MathUtils.radToDeg(e.x)),
    rotY: r(THREE.MathUtils.radToDeg(e.y)),
    rotZ: r(THREE.MathUtils.radToDeg(e.z)),
    scaleX: r(obj.scale.x), scaleY: r(obj.scale.y), scaleZ: r(obj.scale.z),
  };
}
