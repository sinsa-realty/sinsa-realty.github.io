/* 전국 매물지도 — 사이트 화면 (지도: 카카오 키가 있으면 카카오맵, 없으면 오픈지도+위성) */
(function () {
  "use strict";
  const CFG = window.MAEMUL_CONFIG;
  const SITE = document.body.dataset.site;
  const S = CFG.sites[SITE];
  const PHONE = CFG.phones[S.phone];
  const TEL = "tel:" + PHONE.replace(/[^0-9]/g, "");
  const SMS = "sms:" + PHONE.replace(/[^0-9]/g, "");
  document.documentElement.style.setProperty("--brand", S.color);
  document.documentElement.style.setProperty("--accent", S.accent);
  const $ = (q, el = document) => el.querySelector(q);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const M = 10000;

  /* ── 사이트별 조건 ── */
  const RULES = {
    factory: { segs: [["전체"], ["매매", (m) => m.sale != null && !m.low], ["임대", (m) => m.rent != null], ["경매", (m) => m.low != null]],
      price: [["3억 이하", 0, 3 * M], ["3~7억", 3 * M, 7 * M], ["7~15억", 7 * M, 15 * M], ["15억 넘게", 15 * M, 1e12]],
      rent: [["월 100만 이하", 0, 100], ["월 100~200만", 100, 200], ["월 200만 넘게", 200, 1e9]],
      areaKey: "bld", areaName: "건물", area: [["50평 이하", 0, 50], ["50~100평", 50, 100], ["100~300평", 100, 300], ["300평 넘게", 300, 1e9]] },
    house: { segs: [["전체"], ["매매", (m) => m.sale != null && !m.low], ["경매", (m) => m.low != null], ["영상 있음", (m) => !!m.yt]],
      price: [["5천만 이하", 0, 5000], ["5천~1억", 5000, M], ["1~2억", M, 2 * M], ["2억 넘게", 2 * M, 1e12]],
      areaKey: "land", areaName: "대지", area: [["100평 이하", 0, 100], ["100~300평", 100, 300], ["300평 넘게", 300, 1e9]] },
    land: { segs: [["전체"], ["매매", (m) => m.sale != null && !m.low], ["경매", (m) => m.low != null]],
      price: [["5천만 이하", 0, 5000], ["5천~1억", 5000, M], ["1~3억", M, 3 * M], ["3억 넘게", 3 * M, 1e12]],
      areaKey: "land", areaName: "면적", area: [["100평 이하", 0, 100], ["100~300평", 100, 300], ["300~1000평", 300, 1000], ["1000평 넘게", 1000, 1e9]] },
    building: { segs: [["전체"], ["상가주택", (m) => /상가주택|다가구/.test(m.kind)], ["꼬마빌딩", (m) => /근생|꼬마|건물/.test(m.kind) && !/상가주택/.test(m.kind)], ["구분상가", (m) => /상가\(구분\)|근린상가/.test(m.kind)], ["경매", (m) => m.low != null]],
      price: [["7억 이하", 0, 7 * M], ["7~10억", 7 * M, 10 * M], ["10~15억", 10 * M, 15 * M], ["15억 넘게", 15 * M, 1e12]],
      areaKey: "bld", areaName: "건물", area: [["50평 이하", 0, 50], ["50~100평", 50, 100], ["100평 넘게", 100, 1e9]] },
    auction: { segs: [["전체"], ["주택", (m) => /주택|단독|다가구/.test(m.kind)], ["토지", (m) => /대지|농지|과수원|주차장/.test(m.kind)], ["상가·건물", (m) => /근린|상가|지식산업|숙박|다가구|건물/.test(m.kind)], ["아파트·빌라", (m) => /아파트|빌라|오피스텔/.test(m.kind)], ["공장·창고", (m) => /공장|창고/.test(m.kind)], ["추천", (m) => m.judge === "추천"]],
      price: [["5천만 이하", 0, 5000], ["5천~1억", 5000, M], ["1~3억", M, 3 * M], ["3억 넘게", 3 * M, 1e12]],
      areaKey: "land", areaName: "토지", area: [["100평 이하", 0, 100], ["100~300평", 100, 300], ["300평 넘게", 300, 1e9]] },
  };
  const R = RULES[SITE];

  /* ── 글자 모양 ── */
  const won = (v) => { if (v == null) return ""; v = Math.round(v); const e = Math.floor(v / M), r = v % M;
    return (e ? e + "억" : "") + (r ? (e ? " " : "") + r.toLocaleString("ko-KR") + "만" : "") + (v === 0 ? "0" : "") + "원"; };
  const short = (v) => v >= M ? (Math.round(v / 1000) / 10) + "억" : v >= 1000 ? (Math.round(v / 100) / 10) + "천" : v + "만";
  const py = (p) => p == null ? "" : `${(+p).toLocaleString("ko-KR")}평`;
  const sqm = (p) => p == null ? "" : `${Math.round(p * 3.3058).toLocaleString("ko-KR")}㎡`;
  const place = (m) => `${m.sigun}${m.gu ? " " + m.gu : ""} ${m.dong}`;
  function pinText(m, seg) {
    if (m.low != null) return "최저 " + short(m.low);
    if (seg === "임대" && m.rent != null) return "월 " + m.rent;
    if (m.sale != null) return short(m.sale);
    if (m.rent != null) return "월 " + m.rent;
    return "문의";
  }
  function priceHTML(m) {
    if (m.low != null) return `최저 ${won(m.low)}<small>감정가 ${won(m.appr)} · ${esc(m.rate || "")}${m.fails ? " · 유찰 " + m.fails + "회" : ""}</small>`;
    const a = [];
    if (m.sale != null) a.push(`${m.rent != null ? "매매 " : ""}${won(m.sale)}`);
    if (m.rent != null) a.push(`${m.sale != null ? "<small>" : ""}보증금 ${won(m.dep || 0)} / 월 ${won(m.rent)}${m.sale != null ? "</small>" : ""}`);
    return a.join("") || "가격 문의";
  }
  const ICON = {
    factory: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 56V30l14 8v-8l14 8v-8l14 8V10h10v46z"/><path d="M14 46h6M28 46h6M42 46h6"/></svg>',
    house: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><path d="M8 30 32 10l24 20"/><path d="M14 26v30h36V26"/><path d="M27 56V40h10v16"/></svg>',
    land: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 50c10-14 18-14 28-4s18 6 28-8"/><path d="M4 58h56"/><circle cx="46" cy="16" r="6"/></svg>',
    building: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 58V8h26v50M38 22h14v36M6 58h52"/><path d="M19 16h4M27 16h4M19 26h4M27 26h4M19 36h4M27 36h4M44 32h3M44 42h3"/></svg>',
    auction: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3"><path d="m22 10 18 18M14 18l18 18M18 14l18 18M30 26 54 50"/><path d="M8 58h26"/></svg>',
  };
  const kindIcon = (m) => ICON[/공장|창고/.test(m.kind) ? "factory" : /대지|농지|과수원|토지|주차장/.test(m.kind) ? "land" : /상가|근생|근린|빌딩|건물|아파트/.test(m.kind) ? "building" : /주택|단독|다가구|시골/.test(m.kind) ? "house" : SITE];
  const vok = (m, k) => !!m[k] && (!m[k + "At"] || new Date(m[k + "At"]) <= new Date());
  const thImg = (m) => m.th ? `<img loading="lazy" src="/map/p/${encodeURIComponent(m.th)}" alt="${esc(place(m))} ${esc(m.kind)}">` : "";
  // ── 사진 없는 매물 (Code 세션 2026-11-19) ──
  // ① 공장·창고·상가·빌딩형: 공장·빌딩 사이트의 AI 예시 사진(구석에 '예시'), 매물번호로 골라 매물마다 다르게
  const SAMP = {
    fac: "fac_a fac_b fac_c fac_d".split(" ").flatMap((k) => [0, 1, 2, 3, 4, 5].map((i) => `/factory/p/g_${k}${i}.jpg`)),
    wh: [0, 1, 2, 3, 4, 5].map((i) => `/factory/p/g_wh_a${i}.jpg`),
    bld: "brick_remodel kobi_new local_corner retail_mid medical office_mid".split(" ").flatMap((k) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `/building/p/b_${k}${i}.jpg`)),
  };
  const hashN = (t) => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function sampleOf(m) {
    const k = /창고/.test(m.kind) ? "wh" : /공장/.test(m.kind) ? "fac" : /상가|근생|근린시설|빌딩|건물|다가구|아파트/.test(m.kind) ? "bld" : null;
    return k ? SAMP[k][hashN(m.id) % SAMP[k].length] : null;
  }
  // ② 그 밖(주택·토지·경매 등): 카카오 위성사진으로 주변 모습(정확한 지번이 아니라 근처)
  const illHTML = (m) => m.lat != null
    ? `<div class="ill" data-sm="${m.lat},${m.lng}" style="position:absolute;inset:0;overflow:hidden">${kindIcon(m)}<small>위성사진(주변)</small></div>`
    : `<div class="ill">${kindIcon(m)}<small>사진 준비 중</small></div>`;
  const sampHTML = (m, src) => `<span style="position:absolute;right:3px;bottom:3px;z-index:2;background:rgba(0,0,0,.4);color:#fff;padding:0 3px;border-radius:2px;font-size:8px;line-height:12px">예시 사진</span><img loading="lazy" src="${src}" alt="${esc(m.kind)} 예시 사진(실제 매물 아님)" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ill',innerHTML:'<small>사진 준비 중</small>'}))">`;
  const noPhoto = (m) => (sampleOf(m) ? sampHTML(m, sampleOf(m)) : illHTML(m));
  function paintSM(el) {
    if (el.dataset.done || !(window.kakao && kakao.maps && kakao.maps.StaticMap)) return;
    el.dataset.done = "1"; const [la, ln] = el.dataset.sm.split(",").map(Number);
    const box = document.createElement("div"); box.style.cssText = "position:absolute;inset:0"; el.prepend(box);
    try {
      new kakao.maps.StaticMap(box, { center: new kakao.maps.LatLng(la, ln), level: 4, mapTypeId: kakao.maps.MapTypeId.SKYVIEW });
      const t = el.querySelector("small"); if (t) t.style.cssText = "position:absolute;left:6px;bottom:6px;z-index:2;background:rgba(0,0,0,.55);color:#fff;padding:2px 6px;border-radius:4px;font-size:11px";
      const ic = el.querySelector("svg"); if (ic) ic.style.display = "none";
    } catch (e) { box.remove(); }
  }
  const smObs = ("IntersectionObserver" in window) ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { smObs.unobserve(e.target); paintSM(e.target); } }), { rootMargin: "300px" }) : null;
  const fillSM = () => document.querySelectorAll("[data-sm]:not([data-done])").forEach((el) => (smObs ? smObs.observe(el) : paintSM(el)));
  let smT = 0; new MutationObserver(() => { clearTimeout(smT); smT = setTimeout(fillSM, 120); }).observe(document.documentElement, { childList: true, subtree: true });
  function photoHTML(m) {
    const b = [];
    if (m.pick) b.push('<span class="bd pick">추천</span>');
    if (m.low != null) b.push('<span class="bd auc">경매</span>'); else {
      if (m.sale != null) b.push('<span class="bd sale">매매</span>');
      if (m.rent != null) b.push('<span class="bd rent">임대</span>'); }
    if ((m.tags || []).includes("지상권")) b.push('<span class="bd jsg">지상권</span>');
    if (vok(m, "yt") || vok(m, "sh")) b.push('<span class="bd vid">▶ 영상</span>');
    const img = vok(m, "yt") ? `<img loading="lazy" src="https://i.ytimg.com/vi/${m.yt}/hqdefault.jpg" alt="${esc(place(m))} ${esc(m.kind)} 영상 장면">`
      : m.th ? thImg(m) : noPhoto(m);
    return `<div class="photo">${img}<div class="badges">${b.join("")}</div></div>`;
  }
  const cardHTML = (m) => `${photoHTML(m)}<div class="cbody"><div class="cprice num">${priceHTML(m)}</div>
    <div class="cmeta">${esc(place(m))}${m[R.areaKey] != null ? " · " + R.areaName + " " + py(m[R.areaKey]) : ""}</div>
    <div class="ckind">${esc(m.kind)}${m.bid ? " · 입찰 " + m.bid.slice(5).replace("-", "/") : ""}</div></div>`;

  /* ── 상태 ── */
  const st = { seg: "전체", sido: "전체", price: null, area: null, sort: SITE === "auction" ? "bid" : "pick", sel: null, mtype: "map" };
  let items = [], MAP = null;

  function pass(m) {
    const sg = R.segs.find((s) => s[0] === st.seg); if (sg && sg[1] && !sg[1](m)) return false;
    if (st.sido !== "전체" && m.sido !== st.sido) return false;
    if (st.price) { const v = st.seg === "임대" ? m.rent : (m.low ?? m.sale); if (v == null || v <= st.price[1] || v > st.price[2]) return false; }
    if (st.area) { const v = m[R.areaKey]; if (v == null || v <= st.area[1] || v > st.area[2]) return false; }
    return true;
  }
  function sorted(list) {
    const k = (m) => st.seg === "임대" ? m.rent : (m.low ?? m.sale);
    const L = [...list];
    if (st.sort === "low") L.sort((a, b) => (k(a) ?? 1e12) - (k(b) ?? 1e12));
    else if (st.sort === "big") L.sort((a, b) => (b[R.areaKey] ?? -1) - (a[R.areaKey] ?? -1));
    else if (st.sort === "bid") L.sort((a, b) => (a.bid || "9") < (b.bid || "9") ? -1 : 1);
    else L.sort((a, b) => (b.pick ? 2 : 0) + (b.yt ? 1 : 0) - (a.pick ? 2 : 0) - (a.yt ? 1 : 0) || (b.date || "") .localeCompare(a.date || ""));
    return L;
  }

  /* ── 화면 틀 ── */
  const callSVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>';
  document.body.innerHTML = `
  <div class="app">
    <header class="topbar" id="top">
      <div class="tb-row">
        <a class="home" href="../" aria-label="전체 매물 처음 화면">⌂</a>
        <button class="sitepick" id="sitepick" type="button" aria-haspopup="true"><i class="dot"></i><b>${esc(S.full)}</b><span class="caret">▼</span></button>
        <a class="tb-call" href="${TEL}">${callSVG.replace("<svg", '<svg width="18" height="18"')}<span class="ph num">${PHONE}</span><span class="ph-s">전화</span></a>
      </div>
      <div class="chips" id="chips"></div>
      <nav class="sitemenu" id="sitemenu" hidden></nav>
    </header>
    <aside class="side"><div class="side-head"><b id="cnt1"></b><span class="ckind" id="sortname"></span></div><div class="vlist" id="plist"></div></aside>
    <section class="mapbox">
      <div id="map" role="application" aria-label="매물 지도"></div>
      <div class="areaname" id="areaname"></div>
      <div class="maptype" id="maptype"><button data-t="map" aria-pressed="true">지도</button><button data-t="sat">위성</button><button data-t="cad" ${CFG.kakaoKey ? "" : 'title="카카오 지도 키를 넣으면 켜집니다"'}>지적편집도</button></div>
      <div class="mapbtns"><button id="locme" aria-label="전국 보기" title="전국 보기">⟲</button></div>
      <section class="sheet" id="sheet" data-s="peek">
        <button class="sheet-head" id="sheethead" type="button"><i></i><span class="t"><b id="cnt2"></b><span id="sheethint">목록 보기 ▲</span></span></button>
        <div class="carousel" id="carousel"></div>
        <div class="vlist" id="mlist"></div>
      </section>
    </section>
  </div>
  <article class="detail" id="detail" hidden></article>
  <nav class="bar" id="bar">
    <a class="btn call" id="callbtn" href="${TEL}">${callSVG}<span class="lbl">전화하기</span><span class="ph num" id="callno">${PHONE}</span></a>
    <a class="btn sms" href="${SMS}" aria-label="문자 보내기">문자</a>
    <a class="btn kakao" href="${CFG.kakaoChannel}" target="_blank" rel="noopener" aria-label="카카오톡 문의">카톡</a>
  </nav>
  <div class="dlg" id="dlg" hidden><div class="dlg-in" id="dlgin"></div></div>`;
  document.documentElement.style.setProperty("--tbh", $("#top").offsetHeight + "px");

  /* 사이트 메뉴 */
  $("#sitemenu").innerHTML = Object.entries(CFG.sites).map(([k, v]) =>
    `<a href="../${k}/" class="${k === SITE ? "cur" : ""}"><i style="background:${v.color}"></i>${esc(v.full)}<small>${k === SITE ? "지금 보는 곳" : ""}</small></a>`).join("");
  $("#sitepick").onclick = () => { const m = $("#sitemenu"); m.hidden = !m.hidden; };
  document.addEventListener("click", (e) => { if (!e.target.closest("#sitepick,#sitemenu")) $("#sitemenu").hidden = true; });

  /* 조건 칩 */
  const SORTS = SITE === "auction" ? [["bid", "입찰일 빠른순"], ["low", "최저가 낮은순"], ["big", "토지 넓은순"]] : [["pick", "추천순"], ["low", "가격 낮은순"], ["big", "면적 넓은순"]];
  function chips() {
    const sidos = [...new Set(items.map((m) => m.sido))];
    const pr = st.seg === "임대" ? R.rent : R.price;
    $("#chips").innerHTML =
      R.segs.map((s) => `<button class="chip" data-seg="${s[0]}" aria-pressed="${st.seg === s[0]}">${s[0]}</button>`).join("") +
      `<button class="chip ${st.sido !== "전체" ? "on" : ""}" data-dlg="sido">지역 <span class="cv">${st.sido === "전체" ? "전국" : st.sido}</span></button>` +
      `<button class="chip ${st.price ? "on" : ""}" data-dlg="price">${st.seg === "임대" ? "월세" : SITE === "auction" ? "최저가" : "가격"} <span class="cv">${st.price ? st.price[0] : "전체"}</span></button>` +
      `<button class="chip ${st.area ? "on" : ""}" data-dlg="area">${R.areaName} <span class="cv">${st.area ? st.area[0] : "전체"}</span></button>` +
      `<button class="chip" data-dlg="sort">${SORTS.find((s) => s[0] === st.sort)[1]}</button>`;
    $("#chips").querySelectorAll("[data-seg]").forEach((b) => b.onclick = () => { st.seg = b.dataset.seg; st.price = null; refresh(true); });
    $("#chips").querySelectorAll("[data-dlg]").forEach((b) => b.onclick = () => openDlg(b.dataset.dlg, sidos, pr));
  }
  function openDlg(kind, sidos, pr) {
    const box = $("#dlgin"); let html = "";
    const btns = (list, cur, key) => `<div class="opts">${list.map((o, i) => `<button data-i="${i}" aria-pressed="${cur === o[0]}">${o[0]}</button>`).join("")}</div>`;
    if (kind === "sido") { const L = [["전국"], ...sidos.map((s) => [s + " (" + items.filter((m) => m.sido === s).length + ")", s])]; html = `<h3>지역</h3>` + btns(L, st.sido === "전체" ? "전국" : null);
      box.innerHTML = html; box.querySelectorAll("button").forEach((b) => b.onclick = () => { const o = L[+b.dataset.i]; st.sido = o[1] || "전체"; closeDlg(); refresh(true); }); }
    if (kind === "price") { const L = [["전체"], ...pr]; box.innerHTML = `<h3>${st.seg === "임대" ? "월세" : "가격"}</h3>` + btns(L, st.price ? st.price[0] : "전체");
      box.querySelectorAll("button").forEach((b) => b.onclick = () => { const o = L[+b.dataset.i]; st.price = o.length > 1 ? o : null; closeDlg(); refresh(true); }); }
    if (kind === "area") { const L = [["전체"], ...R.area]; box.innerHTML = `<h3>${R.areaName} 면적</h3>` + btns(L, st.area ? st.area[0] : "전체");
      box.querySelectorAll("button").forEach((b) => b.onclick = () => { const o = L[+b.dataset.i]; st.area = o.length > 1 ? o : null; closeDlg(); refresh(true); }); }
    if (kind === "sort") { box.innerHTML = `<h3>정렬</h3>` + btns(SORTS.map((s) => [s[1], s[0]]), SORTS.find((s) => s[0] === st.sort)[1]);
      box.querySelectorAll("button").forEach((b) => b.onclick = () => { st.sort = SORTS[+b.dataset.i][0]; closeDlg(); refresh(false); }); }
    $("#dlg").hidden = false;
  }
  function closeDlg() { $("#dlg").hidden = true; }
  $("#dlg").onclick = (e) => { if (e.target.id === "dlg") closeDlg(); };

  /* ── 목록·카드 ── */
  function fillList(el, list) {
    if (!list.length) { el.innerHTML = `<div class="empty">조건에 맞는 매물이 없습니다.<br>원하시는 조건을 말씀해 주시면 찾아 드립니다.<br><br><a href="${TEL}">☎ ${PHONE}</a></div>`; return; }
    el.innerHTML = list.map((m) => `<a class="card ${m.idx === st.sel ? "sel" : ""}" href="#${m.idx}" data-i="${m.idx}">${cardHTML(m)}</a>`).join("");
  }
  function visible() { const list = items.filter(pass); return MAP ? list.filter((m) => MAP.inView(m)) : list; }
  function renderLists() {
    const all = sorted(items.filter(pass)), inview = sorted(visible());
    const where = st.sido === "전체" ? "전국" : st.sido;
    $("#cnt1").innerHTML = `${where} <em>${all.length}</em>개 · 지도 안 ${inview.length}개`;
    $("#cnt2").innerHTML = `지도 안 매물 <em>${inview.length}</em>개`;
    $("#areaname").innerHTML = `<b>${all.length}</b>건`;
    fillList($("#plist"), inview.length ? inview : all);
    fillList($("#mlist"), inview.length ? inview : all);
    const car = $("#carousel");
    car.innerHTML = (inview.length ? inview : all).slice(0, 30).map((m) => `<a class="card ${m.idx === st.sel ? "sel" : ""}" href="#${m.idx}" data-i="${m.idx}">${cardHTML(m)}</a>`).join("");
    document.documentElement.style.setProperty("--sheet", $("#sheet").offsetHeight + "px");
  }
  $("#sheethead").onclick = () => { const s = $("#sheet"); s.dataset.s = s.dataset.s === "list" ? "peek" : "list"; $("#sheethint").textContent = s.dataset.s === "list" ? "지도 보기 ▼" : "목록 보기 ▲"; };

  function refresh(fit) { chips(); if (MAP) { MAP.setMarkers(items.filter(pass)); if (fit) MAP.fitTo(items.filter(pass)); } renderLists(); }

  /* ── 지도: 오픈지도(기본) ── */
  function leafletMap() {
    const KR = L.latLngBounds([32.8, 124.4], [38.9, 131.2]);
    const map = L.map("map", { zoomControl: false, attributionControl: true, minZoom: 7, maxZoom: 18, maxBounds: KR.pad(0.05), maxBoundsViscosity: 0.8 }).setView([36.2, 127.8], 7);
    const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
    const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "위성 © Esri" });
    const lbl = L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 });
    osm.addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const group = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 52, spiderfyOnMaxZoom: true,
      iconCreateFunction: (c) => { const n = c.getChildCount(), s = n < 10 ? 38 : n < 50 ? 46 : 56; return L.divIcon({ html: `<div class="clu" style="width:${s}px;height:${s}px;font-size:${n < 100 ? 15 : 13}px">${n}</div>`, className: "", iconSize: [s, s] }); } });
    map.addLayer(group);
    const marks = {};
    map.on("moveend", () => renderLists());
    return {
      type(t) { [osm, sat, lbl].forEach((l) => map.hasLayer(l) && map.removeLayer(l)); if (t === "sat") { sat.addTo(map); lbl.addTo(map); } else osm.addTo(map); },
      setMarkers(list) { group.clearLayers(); for (const k in marks) delete marks[k];
        list.forEach((m) => { const cls = ["pin", m.low != null ? "auc" : m.sale == null && m.rent != null ? "rent" : "", m.yt ? "vid" : "", m.idx === st.sel ? "sel" : ""].join(" ");
          const mk = L.marker([m.lat, m.lng], { icon: L.divIcon({ className: "", html: `<div class="${cls}"><span>${esc(pinText(m, st.seg))}</span><i></i></div>`, iconSize: [0, 0] }), riseOnHover: true });
          mk.on("click", () => select(m.idx, true)); marks[m.idx] = mk; group.addLayer(mk); }); },
      inView(m) { return map.getBounds().contains([m.lat, m.lng]); },
      fitTo(list) { if (!list.length) return; const b = L.latLngBounds(list.map((m) => [m.lat, m.lng])); map.fitBounds(b.pad(0.15), { maxZoom: 13, animate: true }); },
      focus(m) { map.setView([m.lat, m.lng], Math.max(map.getZoom(), 13), { animate: true }); },
      all() { map.setView([36.4, 127.9], 7); },
      mini(el, m, sat) { const mm = L.map(el, { zoomControl: false, attributionControl: false, dragging: !L.Browser.mobile, scrollWheelZoom: false }).setView([m.lat, m.lng], 13);
        (sat ? L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}") : L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png")).addTo(mm);
        L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}").addTo(mm);
        L.circle([m.lat, m.lng], { radius: 900, color: S.color, weight: 2, fillOpacity: .12 }).addTo(mm); return mm; },
    };
  }

  /* ── 지도: 카카오맵 (키가 있을 때) ── */
  function kakaoMap() {
    const K = kakao.maps;
    const map = new K.Map($("#map"), { center: new K.LatLng(36.4, 127.9), level: 12 });
    map.addControl(new K.ZoomControl(), K.ControlPosition.BOTTOMRIGHT);
    const clu = new K.MarkerClusterer({ map, averageCenter: true, minLevel: 8, gridSize: 60,
      styles: [{ width: "44px", height: "44px", background: S.color, color: "#fff", borderRadius: "50%", textAlign: "center", lineHeight: "44px", fontWeight: "800", border: "3px solid #fff" }] });
    let ovs = [];
    K.event.addListener(map, "idle", () => renderLists());
    let cad = false;
    return {
      type(t) { map.setMapTypeId(t === "sat" ? K.MapTypeId.HYBRID : K.MapTypeId.ROADMAP);
        if (t === "cad") { map.addOverlayMapTypeId(K.MapTypeId.USE_DISTRICT); cad = true; } else if (cad) { map.removeOverlayMapTypeId(K.MapTypeId.USE_DISTRICT); cad = false; } },
      setMarkers(list) { ovs.forEach((o) => o.setMap(null)); clu.clear(); ovs = [];
        const markers = list.map((m) => { const mk = new K.Marker({ position: new K.LatLng(m.lat, m.lng) }); K.event.addListener(mk, "click", () => select(m.idx, true)); return mk; });
        clu.addMarkers(markers);
        list.forEach((m) => { const d = document.createElement("div"); d.className = ["pin", m.low != null ? "auc" : m.sale == null && m.rent != null ? "rent" : "", m.yt ? "vid" : ""].join(" ");
          d.innerHTML = `<span>${esc(pinText(m, st.seg))}</span><i></i>`; d.style.transform = "translateY(-34px)"; d.onclick = () => select(m.idx, true);
          const o = new K.CustomOverlay({ position: new K.LatLng(m.lat, m.lng), content: d, yAnchor: 1 }); ovs.push(o); });
        const show = () => { const lv = map.getLevel(); ovs.forEach((o) => o.setMap(lv <= 8 ? map : null)); };
        K.event.addListener(map, "zoom_changed", show); show(); },
      inView(m) { return map.getBounds().contain(new K.LatLng(m.lat, m.lng)); },
      fitTo(list) { if (!list.length) return; const b = new K.LatLngBounds(); list.forEach((m) => b.extend(new K.LatLng(m.lat, m.lng))); map.setBounds(b); },
      focus(m) { map.setCenter(new K.LatLng(m.lat, m.lng)); if (map.getLevel() > 6) map.setLevel(6); },
      all() { map.setCenter(new K.LatLng(36.4, 127.9)); map.setLevel(12); },
      mini(el, m, sat) { const mm = new K.Map(el, { center: new K.LatLng(m.lat, m.lng), level: 7, mapTypeId: sat ? K.MapTypeId.HYBRID : K.MapTypeId.ROADMAP });
        new K.Circle({ map: mm, center: new K.LatLng(m.lat, m.lng), radius: 900, strokeColor: S.color, fillColor: S.color, fillOpacity: .12 }); return mm; },
    };
  }

  $("#maptype").onclick = (e) => { const b = e.target.closest("button"); if (!b || !MAP) return;
    if (b.dataset.t === "cad" && !CFG.kakaoKey) { toast("지적편집도는 카카오 지도 키를 넣으면 켜집니다"); return; }
    st.mtype = b.dataset.t; $("#maptype").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); MAP.type(st.mtype); };
  $("#locme").onclick = () => MAP && MAP.all();

  /* ── 선택·상세 ── */
  function select(i, fromMap) {
    st.sel = i; const m = items[i];
    if (MAP) MAP.setMarkers(items.filter(pass));
    renderLists();
    if (fromMap) { const c = document.querySelector(`#carousel .card[data-i="${i}"]`) || document.querySelector(`#plist .card[data-i="${i}"]`);
      c && c.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }
  }
  function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 2000); }

  function detail(m) {
    const D = $("#detail");
    const facts = [];
    if (m.low != null) { facts.push([won(m.appr).replace("원", ""), "감정가"], [m.rate || "-", "최저가율"], [m.bid ? m.bid.slice(5).replace("-", "/") : "-", "입찰일"]); }
    else { if (m.land != null) facts.push([py(m.land), "대지"]); if (m.bld != null) facts.push([py(m.bld), "건물"]); facts.push([m.year || (m.date ? m.date.slice(2).replace(/-/g, ".") : "-"), m.year ? "사용승인" : "등록일"]); }
    if (facts.length < 3) facts.push([m.sigun, "시·군"]);
    if (facts.length < 3) facts.push([m.kind.replace(/\(.*\)/, ""), "종류"]);
    const rows = [["매물번호", m.id], ["종류", m.kind], ["소재지", `${m.sido} ${place(m)}`]];
    if (m.low != null) { rows.push(["사건번호", m.case], ["법원", m.court], ["감정가", won(m.appr)], ["최저가", won(m.low)], ["유찰", m.fails ? m.fails + "회" : null], ["입찰일", m.bid]);
      [["판정", m.judge], ["사용승인", m.year], ["구조", m.struct], ["매각범위", m.scope], ["주의사항", m.risk]].forEach((r) => { if (r[1]) rows.push(r); }); }
    else { if (m.sale != null) rows.push(["매매가", won(m.sale)]); if (m.rent != null) rows.push(["보증금 / 월세", `${won(m.dep || 0)} / ${won(m.rent)}`]); }
    rows.push(["대지 면적", m.land != null ? `${py(m.land)} (${sqm(m.land)})` : null], ["건물 면적", m.bld != null ? `${py(m.bld)} (${sqm(m.bld)})` : null]);
    if (m.floors) rows.push(["층수", m.floors]);
    if (SITE === "factory") rows.push(["전력", null], ["층고", null], ["호이스트", null], ["진입로", null]);
    if (SITE === "land") rows.push(["지목", null], ["용도지역", null], ["도로", null]);
    const hero = vok(m, "yt") ? `<img src="https://i.ytimg.com/vi/${m.yt}/hqdefault.jpg" alt="${esc(place(m))} 영상 장면"><a class="play" href="https://youtu.be/${m.yt}" target="_blank" rel="noopener">▶ 영상으로 보기</a>`
      : m.th ? thImg(m) : `<div class="photo" style="aspect-ratio:auto;height:100%">${noPhoto(m)}</div>`;
    D.innerHTML = `
      <div class="d-top"><button type="button" id="dback" aria-label="뒤로">←</button><button type="button" id="dshare" aria-label="링크 복사">⤴</button></div>
      <div class="d-hero">${hero}</div>
      <section class="d-sec">
        <div class="badges" style="position:static">${photoHTML(m).match(/<div class="badges">(.*?)<\/div><\/div>$/)[1]}</div>
        <p class="d-title">${esc(m.sido)} ${esc(place(m))} · ${esc(m.kind)}</p>
        <div class="d-price num">${priceHTML(m)}</div>
        <div class="facts">${facts.slice(0, 3).map((f) => `<div class="fact"><b class="num">${esc(f[0])}</b><span>${f[1]}</span></div>`).join("")}</div>
        ${m.feats ? `<div class="feats" style="margin-top:14px">${m.feats.map((f) => `<span>${esc(f)}</span>`).join("")}</div>` : ""}
        ${(m.tags || []).includes("지상권") ? '<div class="warn">지상권 매물입니다. 토지는 포함되지 않습니다.</div>' : ""}
        ${m.low != null ? '<div class="warn">경매 물건입니다. 권리 확인과 입찰 준비는 전화로 상담해 드립니다.</div>' : ""}
        <div class="say">전화 주실 때 <b>“${esc(m.id)}” 보고 연락드려요</b>라고 말씀해 주세요.</div>
      </section>
      <section class="d-sec"><h2>상세 정보</h2><dl class="rows">${rows.map((r) => `<div><dt>${r[0]}</dt><dd class="${r[1] == null ? "wait" : ""}">${r[1] == null ? "문의 시 안내" : esc(r[1])}</dd></div>`).join("")}</dl></section>
      ${m.note || m.link ? `<section class="d-sec"><h2>물건 분석</h2>${m.note ? `<p style="line-height:1.65;margin:0 0 12px">${esc(m.note).split(" / ").join("<br>")}</p>` : ""}${m.link ? `<a class="btn" style="display:block;text-align:center;background:#1f2937;color:#fff;padding:12px;border-radius:10px;text-decoration:none" href="${esc(m.link)}" target="_blank" rel="noopener">경매 원문(감정서·현장 사진) 보기</a>` : ""}</section>` : ""}
      ${vok(m, "yt") ? `<section class="d-sec"><h2>영상</h2><div class="share"><a class="btn" style="background:#dc2626;color:#fff;flex:1" href="https://youtu.be/${m.yt}" target="_blank" rel="noopener">▶ 본편 보기</a>${vok(m, "sh") ? `<a class="btn" style="background:#111;color:#fff;flex:1" href="https://youtube.com/shorts/${m.sh}" target="_blank" rel="noopener">▶ 쇼츠</a>` : ""}</div></section>` : ""}
      <section class="d-sec"><h2>위치 <span class="ckind">(읍·면 근처, 정확한 위치는 상담 시 안내)</span></h2><div class="minimap" id="minimap"></div></section>
      <section class="d-sec"><div class="share"><button type="button" id="dcopy">링크 복사</button><a class="btn kakao" style="flex:1" href="${CFG.kakaoChannel}" target="_blank" rel="noopener">카톡 문의</a></div>
        <p class="note">매물 정보는 등록 당시 기준이며 현장 사정에 따라 달라질 수 있습니다.</p></section>`;
    D.hidden = false; D.scrollTop = 0;
    $("#callbtn").href = TEL;
    $("#dback").onclick = () => { history.length > 1 ? history.back() : (location.hash = ""); };
    const copy = () => { const u = location.href; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast("링크를 복사했습니다. 카톡에 붙여 보내세요"), () => prompt("이 주소를 복사하세요", u)); };
    $("#dshare").onclick = copy; $("#dcopy").onclick = copy;
    if (navigator.share) $("#dshare").onclick = () => navigator.share({ title: `${place(m)} ${m.kind}`, url: location.href }).catch(() => {});
    try { if (MAP) MAP.mini($("#minimap"), m, true); } catch (e) { $("#minimap").textContent = place(m); }
    document.title = `${place(m)} ${m.kind} · ${S.full}`;
  }
  function route() {
    const h = location.hash.slice(1); const m = /^\d+$/.test(h) ? items[+h] : null;
    if (m) { detail(m); if (MAP && st.sel !== m.idx) { st.sel = m.idx; MAP.focus(m); } }
    else { $("#detail").hidden = true; document.title = S.full; }
  }
  window.addEventListener("hashchange", route);

  /* ── 시작 ── */
  function start() {
    fetch(`../data/${SITE}.json`).then((r) => r.json()).then((data) => {
      items = data; items.forEach((m, i) => m.idx = i);
      try { MAP = CFG.kakaoKey && window.kakao && kakao.maps ? kakaoMap() : leafletMap(); } catch (e) { console.error(e); MAP = null; }
      refresh(true); route();
    });
  }
  if (CFG.kakaoKey) {
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${CFG.kakaoKey}&libraries=clusterer,services&autoload=false`;
    s.onload = () => kakao.maps.load(start); s.onerror = start; document.head.append(s);
  } else start();
})();
