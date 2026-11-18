// ───────────────────────────────────────────────────────────
// 매물 지도 사이트 설정 — 번호·카톡·지도 키는 여기 한 곳만 고치면 모든 사이트에 반영됩니다.
// ───────────────────────────────────────────────────────────
window.MAEMUL_CONFIG = {
  brand: "전국 매물지도",
  phones: {
    owner: "050-7977-9805",   // 어르신 본인: 공장·창고, 경매, 빌딩
    staff: "050-7977-1062"    // 담당자(이해주 이사님): 시골집·전원주택, 토지 — 담당이 바뀌면 이 줄만 변경
  },
  kakaoChannel: "https://pf.kakao.com/_pxixcJxj/chat",   // 반값급매TV 1:1 문의
  // 카카오맵 JavaScript 키 — 받으면 여기에 넣습니다. 넣으면 카카오 지도·스카이뷰(위성)·지적편집도로 바뀝니다.
  kakaoKey: "65ba3376b8642d2080e2ded313e5f828",
  sites: {
    factory:  { name: "공장·창고",       full: "전국 공장·창고",       phone: "owner", color: "#1f4e5f", accent: "#f2a900", icon: "factory" },
    house:    { name: "시골집·전원주택", full: "전국 시골집·전원주택", phone: "staff", color: "#2f5d3a", accent: "#f2a900", icon: "house" },
    land:     { name: "토지",           full: "전국 토지",           phone: "staff", color: "#6b4a24", accent: "#f2a900", icon: "land" },
    building: { name: "빌딩·상가주택",   full: "빌딩·상가주택",        phone: "owner", color: "#2e3463", accent: "#f2a900", icon: "building" },
    auction:  { name: "경매",           full: "전국 경매 물건",       phone: "owner", color: "#8a2b12", accent: "#f2a900", icon: "auction" }
  }
};
