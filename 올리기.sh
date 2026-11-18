#!/bin/bash
# 우리 매물 사이트 3곳을 이 보관함으로 모아 깃허브 공개 홈페이지에 올림
# 어느 대화방·코워크에서든: bash /c/Users/smfqh/깃허브/홈페이지/올리기.sh "무엇을 고쳤는지 한 줄"
# 원본 폴더(여기서 고치면 안 됨, 원본을 고친 뒤 이걸 돌림):
#   pension  ← C:\Users\smfqh\펜션매매\사이트
#   factory  ← C:\Users\smfqh\공장매매\사이트
#   building ← C:\Users\smfqh\빌딩매매\사이트
# map/(시골집·토지·경매·상가주택·종합) 은 11/7 아티팩트에서 가져온 고정 폴더 — 이 스크립트가 지우지 않음
# 장부·전화번호·주소 원본은 절대 여기 넣지 않음(공개됨)
set -e
cd "$(dirname "$0")"
copy() { rm -rf "$2"; mkdir -p "$2"; cp -r "$1"/index.html "$1"/m "$1"/p "$2"/; }
copy /c/Users/smfqh/펜션매매/사이트 pension
find pension/p -name '*_h[3-9].jpg' -delete
copy /c/Users/smfqh/공장매매/사이트 factory
copy /c/Users/smfqh/빌딩매매/사이트 building
# 원본 폴더에 없고 아티팩트에만 있던 사진(당근 매물 사진 등)을 덧붙임 — 같은 이름이 있으면 원본 우선
for d in factory pension building; do [ -d ../추가사진/$d/p ] && cp -rn ../추가사진/$d/p/. $d/p/ ; done
# 종합지도(map/) 화면: 예시 사진·위성사진·경매 상세가 빠져 있으면 다시 넣음(다른 세션이 app.js를 통째로 바꿔도 유지)
python -I /c/Users/smfqh/지도자료/도구/종합지도_사진상세적용.py map/assets/app.js
# 공개본에만 카카오 지도 넣기(키는 map/assets/config.js, 원본은 그대로)
python -I /c/Users/smfqh/지도자료/도구/카카오적용.py factory/index.html pension/index.html building/index.html
# 공개 전 점검: 휴대폰 번호가 들어가면 멈춤
if grep -rlE "01[016789]-?[0-9]{3,4}-?[0-9]{4}" --include=*.html --include=*.json . ; then echo "휴대폰 번호 발견 — 올리지 않음"; exit 1; fi
# 용량 점검: GitHub Pages 한도 1GB(공개 사이트), 저장소 권장 1GB. 700MB 넘으면 경고 → 협업지침 8장(클라우드플레어 이전) 따름
SZ=$(du -sm --exclude=.git . | cut -f1); NF=$(find . -path ./.git -prune -o -type f -print | wc -l)
echo "사이트 용량 ${SZ}MB / 1024MB · 파일 ${NF}개"
[ "$SZ" -gt 700 ] && echo "⚠ 용량 700MB 넘음 — 협업지침 8장대로 사진 압축 또는 Cloudflare Pages 이전 준비"
git add -A
git commit -q -m "${1:-사이트 갱신}" || { echo "바뀐 것 없음"; exit 0; }
git push -q
echo "올림 완료"
