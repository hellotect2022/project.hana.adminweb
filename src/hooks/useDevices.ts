import { useQuery } from '@tanstack/react-query';
import { fetchDevicesPage } from '@/services/deviceService';

// TanStack Query 로 장비 목록(페이지). data 가 Page<DeviceDTO> 로 타입 추론됨.
export function useDevices(page = 0, keyword = '') {
  return useQuery({
    queryKey: ['devices', page, keyword],
    queryFn: () => fetchDevicesPage({ page, size: 20, keyword }),
  });
}
