# 실제 음식점 카드 검토

`/review/recommendations`는 실제 배포 Recommendation API로 수집한 음식점 세 곳을 여섯 조건으로 비교하는 화면입니다. 같은 화면을 [ChatGPT Sites](https://local-restaurant-card-review.linedchord4.chatgpt.site)에서도 봅니다.

- 현재 메인 탐색 화면과 별도의 검토 진입점입니다. 상위 다섯 곳은 API 반환 순서이며, 큰 카드는 설명 변화를 확인하기 위해 고른 표본입니다.
- 전체 페이지를 확인한 저장 비교와 현재 일부 페이지의 재확인을 구분합니다. 재확인 페이지에 없다는 이유로 전체 추천에서 제외되었다고 판단하지 않습니다.
- 주변 설명은 2025년 내국인 20·30대의 지역 지표입니다. 선정 기여도·매장 고객·현재 혼잡·영업·대기 시간으로 해석하지 않습니다.
- 매장 상세·사진·리뷰는 Sites 서버에서 Google Places를 조회합니다. 키와 Google 응답은 FE Git·브라우저 저장소에 넣지 않습니다. 리뷰·사진 작성자와 원문 링크를 함께 표시합니다.
- 평가만 기기에 보관하고, 저장 버튼으로 Sites에 같은 브라우저 세션의 평가를 누적합니다. 공유 집계는 현재 문안 버전 기준입니다. Google 콘텐츠는 평가 내보내기에 포함하지 않습니다.

API 프록시의 대상은 이 검토 Site 하나로 고정합니다. 원래 FE의 previewDataSource나 기존 필터·지도 상태를 전환하지 않습니다. 자료 생성 과정은 analysis의 `60_live_restaurant_card_review.ipynb`에서 확인합니다. 결과는 analysis의 Git 제외 `out/uplus/live_restaurant_card_review/`에 저장합니다.
