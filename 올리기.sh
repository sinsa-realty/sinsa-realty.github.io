#!/bin/bash
# 우리 매물 사이트 3곳을 이 보관함으로 모아 깃허브 공개 홈페이지에 올림
# 어느 대화방·코워크에서든: bash /c/Users/smfqh/깃허브/홈페이지/올리기.sh "무엇을 고쳤는지 한 줄"
# 원본 폴더(여기서 고치면 안 됨, 원본을 고친 뒤 이걸 돌림):
#   pension  ← C:\Users\smfqh\펜션매매\사이트
#   factory  ← C:\Users\smfqh\공장매매\사이트
#   building ← C:\Users\smfqh\빌딩매매\사이트
# 장부·전화번호·주소 원본은 절대 여기 넣지 않음(공개됨)
set -e
cd "$(dirname "$0")"
copy() { rm -rf "$2"; mkdir -p "$2"; cp -r "$1"/index.html "$1"/m "$1"/p "$2"/; }
copy /c/Users/smfqh/펜션매매/사이트 pension
find pension/p -name '*_h[3-9].jpg' -delete
copy /c/Users/smfqh/공장매매/사이트 factory
copy /c/Users/smfqh/빌딩매매/사이트 building
# 공개 전 점검: 휴대폰 번호가 들어가면 멈춤
if grep -rlE "01[016789]-?[0-9]{3,4}-?[0-9]{4}" --include=*.html --include=*.json . ; then echo "휴대폰 번호 발견 — 올리지 않음"; exit 1; fi
git add -A
git commit -q -m "${1:-사이트 갱신}" || { echo "바뀐 것 없음"; exit 0; }
git push -q
echo "올림 완료"
