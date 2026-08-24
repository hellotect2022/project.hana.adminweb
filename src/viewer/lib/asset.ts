// 배포 base(VITE_BASE)를 반영한 정적 리소스(public) 경로 생성 헬퍼.
// 예) base="/admin/" 일 때 assetUrl('/models/a.glb') -> "/admin/models/a.glb"
//     base="/"       일 때                          -> "/models/a.glb"
const BASE = import.meta.env.BASE_URL; // 항상 "/" 로 끝남

export function assetUrl(path: string): string {
  return `${BASE}${path.replace(/^\//, '/')}`;
}
