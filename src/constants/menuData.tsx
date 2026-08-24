import { SvgIcons } from "@/components/common/Icon";
import AuthFeaturePermissionPage from "@/pages/auth/AuthFeaturePermissionPage";
import AuthGroupsPage from "@/pages/auth/AuthGroupsPage";
import AuthMenuPermissionPage from "@/pages/auth/AuthMenuPermissionPage";
import DisabledMenuPlaceholder from "@/components/common/DisabledMenuPlaceholder";
import SopTemplateManagePage from "@/pages/sop/SopTemplateManagePage";
import SopTemplateEditorPage from "@/pages/sop/SopTemplateEditorPage";
import EventThresholdPage from "@/pages/event/EventThresholdPage";
import AlarmEventPolicyPage from "@/pages/event/AlarmEventPolicyPage";
import LogHubPage from "@/pages/log/LogHubPage";
import MenuDisplayPage from "@/pages/menu/MenuDisplayPage";
import MenuEditPage from "@/pages/menu/MenuEditPage";
import DeviceManagePage from "@/pages/device/DeviceManagePage";
import SystemLogRetentionPage from "@/pages/system/SystemLogRetentionPage";
import SystemServerPage from "@/pages/system/SystemServerPage";
import UserManageGroupPage from "@/pages/users/UserManageGroupPage";
import UserManagePage from "@/pages/users/UserManagePage";
import DeviceCategoryManagePage from "@/pages/device/DeviceCategoryManagePage";
import DeviceRegistPage from "@/pages/device/DeviceRegistPage";
import DevicePointMappingPage from "@/pages/device/DevicePointMappingPage";
import DeviceValueHistoryPage from "@/pages/device/DeviceValueHistoryPage";
import SystemDiagramPage from "@/pages/device/SystemDiagramPage";
import CommandPointPage from "@/pages/command/CommandPointPage";
import DeviceControlPage from "@/pages/command/DeviceControlPage";
import UnityAssetManagePage from "@/pages/unityAsset/UnityAssetManagePage";
import ZoneManagePage from "@/pages/zone/ZoneManagePage";
import SpaceLightManagePage from "@/pages/zone/SpaceLightManagePage";

export const menuData = [
  {
    label: "사용자 관리",
    abbr: "사용자",
    items: [
      { title: "사용자 관리", 
        //icon: <SvgIcons.FileCheck/>, 
        path: "/manage/user", element: <UserManagePage/> },
      { title: "사용자 그룹(권한)", 
        //icon: <SvgIcons.Users/>, 
        path: "/manage/group", element: <UserManageGroupPage/> },
    ]
  },
  {
    label: "시스템 메뉴 설정",
    abbr: "시스템",
    items: [
      { title: "시스템 표시 설정", 
        //icon: <SvgIcons.Setting/>, 
        path: "/menu/display", element:<MenuDisplayPage/>},
      { title: "그룹별 시스템메뉴 권한",
        //icon: <SvgIcons.Widget/>,
        path: "/auth/menu-permission" ,element:<AuthMenuPermissionPage/>},
    ]
  },
  {
    label: "구역 설정",
    abbr: "구역",
    items: [
      { title: "2D Zone 관리",
        //icon: <SvgIcons.Layers/>,
        path: "/zone/manage", element:<ZoneManagePage/>},
      { title: "3D 공간·조명/화재감지 구역 관리",
        //icon: <SvgIcons.Layers/>,
        path: "/zone/space-light", element:<SpaceLightManagePage/>},
    ]
  },
  {
    label: "에셋 관리",
    abbr: "에셋",
    items: [
      { title: "장비 에셋 관리", 
        //icon: <SvgIcons.Layers/>, 
        path: "/asset/3d-manage", element: <UnityAssetManagePage/> },
    ]
  },
  {
    label: "장비 관리",
    abbr: "장비",
    items: [
      { title: "장비 카테고리 관리", 
        //icon: <SvgIcons.Siren/>, 
        path: "/category/manage", element: <DeviceCategoryManagePage/>},
      { title: "장비 관리", 
        //icon: <SvgIcons.Siren/>, 
        path: "/device/manage", element: <DeviceManagePage/>},
      { title: "포인트 정보 매핑",
        //icon: <SvgIcons.Layers/>,
        path: "/device/point-mapping", element: <DevicePointMappingPage/>},
      { title: "실시간 값 이력",
        //icon: <SvgIcons.Layers/>,
        path: "/device/value-history", element: <DeviceValueHistoryPage/>},
      { title: "계통도",
        //icon: <SvgIcons.Layers/>,
        path: "/device/system-diagram", element: <SystemDiagramPage/>},
    ]
  },
  {
    label: "디바이스 제어",
    abbr: "제어",
    items: [
      { title: "제어 포인트 관리",
        //icon: <SvgIcons.Siren/>,
        path: "/command/points", element: <CommandPointPage/>},
      { title: "디바이스 제어",
        //icon: <SvgIcons.Siren/>,
        path: "/command/control", element: <DeviceControlPage/>},
    ]
  },
  {
    label: "이벤트 관리",
    abbr: "이벤트",
    items: [
      // {
      //   title: "유형 관리",
      //   //icon: <SvgIcons.Siren/>,
      //   path: "/event/type",
      //   disabled: true,
      //   disabledReason:
      //     "백엔드에 이벤트 유형 전용 API가 없습니다. 유형·심각도는 임계값(규칙) 설정에서 관리합니다.",
      //   element: (
      //     <DisabledMenuPlaceholder
      //       title="유형 관리"
      //       description="이벤트 유형을 관리합니다."
      //       reason="백엔드에 이벤트 유형 전용 API가 없습니다. 유형·심각도는 「임계값 설정」에서 규칙별로 지정합니다."
      //     />
      //   ),
      // },
      // {
      //   title: "명칭 관리",
      //   //icon: <SvgIcons.CheckList/>,
      //   path: "/event/name",
      //   disabled: true,
      //   disabledReason:
      //     "백엔드에 이벤트 명칭 마스터 API가 없습니다. 규칙 이름·이벤트 인스턴스 명칭은 각각 규칙·런타임에서 설정됩니다.",
      //   element: (
      //     <DisabledMenuPlaceholder
      //       title="명칭 관리"
      //       description="이벤트 명칭을 관리합니다."
      //       reason="백엔드에 이벤트 명칭 마스터 API가 없습니다. 규칙 이름은 「임계값 설정」, 발생 시 명칭은 이벤트 인스턴스에서 처리됩니다."
      //     />
      //   ),
      // },
      // { title: "임계값 설정",
      //   //icon: <SvgIcons.Layers/>,
      //   path: "/event/threshold", element: <EventThresholdPage/> },
      { title: "알람/이벤트 정책",
        //icon: <SvgIcons.Siren/>,
        path: "/event/alarm-policy",
        element: <AlarmEventPolicyPage/>
      },
      // {
      //   title: "알림 설정",
      //   //icon: <SvgIcons.Bell/>,
      //   path: "/event/notification",
      //   disabled: true,
      //   disabledReason:
      //     "알림 전용 API가 없습니다. 알림·알람·SOP 등 동작은 임계값(규칙)의 actions 필드에서 설정합니다.",
      //   element: (
      //     <DisabledMenuPlaceholder
      //       title="알림 설정"
      //       description="이벤트 알림 방식을 설정합니다."
      //       reason="알림 전용 API가 없습니다. 알림·알람·SOP·제어 연동은 「임계값 설정」 규칙 편집의 동작(actions)에서 선택합니다."
      //     />
      //   ),
      // },
      { title: "SOP 템플릿",
        //icon: <SvgIcons.CheckList/>,
        path: "/sop/templates", element: <SopTemplateManagePage/> },
    ]
  },
  {
    label: "로그 관리",
    abbr: "로그",
    items: [
      { title: "접속 로그", 
        //icon: <SvgIcons.SidebarCode/>,
        path: "/log/access" , element:<LogHubPage/>},
      { title: "사용 로그", 
        //icon: <SvgIcons.Code/>, 
        path: "/log/usage", element:<LogHubPage/>},
      { title: "운영 통계", 
        //icon: <SvgIcons.PieChart/>, 
        path: "/log/statistics", element:<LogHubPage/>},
    ]
  },
  {
    label: "시스템 관리",
    abbr: "시스템",
    items: [
      { title: "서버 관리 콘솔", 
        //icon: <SvgIcons.Server/>, 
        path: "/system/server" , element:<SystemServerPage/>},
      { title: "로그 보관 기간", 
        //icon: <SvgIcons.Folder/>, 
        path: "/system/log-retention" , element:<SystemLogRetentionPage/>},
    ]
  },
  {
    label: "테스트",
    abbr: "테스트",
    items: [
      { title: "테스트1", 
        //icon: <SvgIcons.Server/>, 
        path: "/test/1" , element:<AuthGroupsPage/>},
    ]
  }
];