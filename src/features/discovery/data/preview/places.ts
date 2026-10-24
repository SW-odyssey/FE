import type { LocalPlace } from "../../model.ts";
// The launch collection is editorial, not a ranking of Korean venue visitors.
// Region-level population data must not be presented as individual shop footfall.
export const localPlaces: LocalPlace[] = [
  {
    id: "cheongsudang",
    name: "Cheongsudang",
    koreanName: "청수당",
    area: "ikseon",
    category: "cafe",
    image: "/assets/local/cheongsudang.jpg",
    descriptionEn:
      "Bamboo, flowing water, and a quiet courtyard in an Ikseon-dong hanok. A café to slow down in.",
    descriptionKo:
      "대나무와 물길, 한옥 마당이 어우러진 익선동 카페. 골목 산책 중 잠시 쉬어 가세요.",
    address: "서울 종로구 돈화문로11나길 31-9",
    lat: 37.5744,
    lng: 126.9898,
    sourceUrl: "https://glowseoul.co.kr/en/portfolio/cheongsudang-iksun",
    imageCredit: "Glow Seoul",
  },
  {
    id: "seoulcoffee",
    name: "Seoul Coffee",
    koreanName: "서울커피 익선점",
    area: "ikseon",
    category: "cafe",
    image: "/assets/local/seoulcoffee.jpg",
    descriptionEn:
      "Old hanok textures meet a modern café. Coffee and dessert in the winding lanes of Ikseon-dong.",
    descriptionKo:
      "오래된 한옥의 질감과 모던한 공간이 만나는 카페. 익선동 골목에서 커피와 디저트를 즐겨 보세요.",
    address: "서울 종로구 수표로28길 33-3",
    lat: 37.5731,
    lng: 126.9901,
    sourceUrl: "https://www.labotory.com/project/seoul-coffee/",
    imageCredit: "LABOTORY · Choi Yong Joon",
  },
  {
    id: "oncheonjip",
    name: "Oncheonjip",
    koreanName: "온천집 익선",
    area: "ikseon",
    category: "food",
    image: "/assets/local/oncheonjip.jpg",
    descriptionEn:
      "A shabu-shabu restaurant with a courtyard setting. A sit-down meal after wandering through Ikseon-dong.",
    descriptionKo:
      "마당이 있는 공간에서 즐기는 샤부샤부. 익선동 산책 뒤 식사 후보로 살펴보세요.",
    address: "서울 종로구 돈화문로11나길 31-8",
    lat: 37.5742,
    lng: 126.9899,
    sourceUrl:
      "https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=175219",
    imageCredit: "Glow Seoul",
    imageSourceUrl: "https://glowseoul.co.kr/portfolio/oncheonjip-iksun",
  },
  {
    id: "hanyakbang",
    name: "Coffee Hanyakbang",
    koreanName: "커피한약방",
    area: "eulji",
    category: "cafe",
    image: "/assets/local/hanyakbang.jpg",
    descriptionEn:
      "Hand-drip coffee, mother-of-pearl cabinets, and a hidden Euljiro lane. Step into a different side of central Seoul.",
    descriptionKo:
      "핸드드립 커피와 자개장, 을지로 좁은 골목이 만나는 카페. 도심의 다른 분위기를 만나 보세요.",
    address: "서울 중구 삼일대로12길 16-6",
    lat: 37.5662,
    lng: 126.9901,
    sourceUrl: "https://english.visitseoul.net/area/coffeehanyakbang/ENPyiaqhs",
    imageCredit: "Visit Seoul",
  },
  {
    id: "ssamziegil",
    name: "Ssamziegil",
    koreanName: "쌈지길",
    area: "insa",
    category: "culture",
    image: "/assets/local/ssamziegil.jpg",
    descriptionEn:
      "Follow the gently winding walkway past small craft shops. An easy place to browse while exploring Insadong.",
    descriptionKo:
      "완만하게 이어지는 길을 따라 작은 공예 상점을 둘러보세요. 인사동 산책 중 구경하기 좋은 공간이에요.",
    address: "서울 종로구 인사동길 44",
    lat: 37.5745,
    lng: 126.9847,
    sourceUrl: "https://english.visitseoul.net/area/Ssamzi-gil/ENP037934",
    imageCredit: "Visit Seoul",
  },
  {
    id: "nogari",
    name: "Nogari Alley",
    koreanName: "을지로 노가리 골목",
    area: "eulji",
    category: "food",
    image: "/assets/local/nogari.jpg",
    descriptionEn:
      "An Euljiro alley of beer spots and simple snacks. Explore the neighborhood’s evening atmosphere.",
    descriptionKo:
      "맥주와 간단한 안주를 즐길 수 있는 을지로 골목. 저녁 골목의 분위기를 살펴보세요.",
    address: "서울 중구 충무로9길 12",
    lat: 37.5674,
    lng: 126.9928,
    sourceUrl:
      "https://english.visitseoul.net/area/Euljiro-Nogari-Alley/ENPf8bj59",
    imageCredit: "Visit Seoul",
  },
  {
    id: "osulloc",
    name: "Osulloc Bukchon",
    koreanName: "오설록 북촌",
    area: "bukchon",
    category: "cafe",
    image: "/assets/local/osulloc.jpg",
    descriptionEn:
      "Tea and desserts with views across the rooftops of Bukchon. A place to pause between the neighborhood’s hanok lanes.",
    descriptionKo:
      "북촌의 한옥 지붕을 바라보며 차와 디저트를 즐기는 공간. 골목 산책 사이에 잠시 쉬어 가기 좋아요.",
    address: "서울 종로구 북촌로 45",
    lat: 37.5809985877276,
    lng: 126.984600900483,
    sourceUrl:
      "https://english.visitseoul.net/area/osulloc-teahouse-bukchon/ENPvzz06x",
    imageCredit: "Visit Seoul",
  },
  {
    id: "imun",
    name: "Imun Seollongtang",
    koreanName: "이문설농탕",
    area: "insa",
    category: "food",
    image: "/assets/local/imun.jpg",
    descriptionEn:
      "A long-established Jongno restaurant serving slowly simmered ox-bone soup. A straightforward Korean meal near Insadong.",
    descriptionKo:
      "오랜 시간 끓인 설렁탕을 내는 종로의 오래된 식당. 인사동 산책과 함께 한식 한 끼를 즐겨보세요.",
    address: "서울 종로구 우정국로 38-13",
    lat: 37.572695,
    lng: 126.98388,
    sourceUrl: "https://english.visitseoul.net/eat/imun-seollongtang/ENP012846",
    imageCredit: "Visit Seoul",
  },
  {
    id: "layered",
    name: "Café Layered",
    koreanName: "카페 레이어드",
    area: "bukchon",
    category: "cafe",
    image: "/assets/local/layered.jpg",
    descriptionEn:
      "Scones, cakes and bakery displays inside an Anguk hanok café. Pick a dessert before heading into the Bukchon lanes.",
    descriptionKo:
      "안국의 한옥에서 스콘과 케이크를 즐기는 카페. 북촌 골목을 둘러보기 전 디저트를 골라보세요.",
    address: "서울 종로구 북촌로2길 2-3",
    lat: 37.5777414803804,
    lng: 126.985931528189,
    sourceUrl:
      "https://korean.visitseoul.net/restaurants/%EC%B9%B4%ED%8E%98-%EB%A0%88%EC%9D%B4%EC%96%B4%EB%93%9C-%EC%95%88%EA%B5%AD%EC%A0%90/KOP038318",
    imageCredit: "Visit Seoul",
  },
  {
    id: "songam",
    name: "Songam Onban",
    koreanName: "송암온반",
    area: "ikseon",
    category: "food",
    image: "/assets/local/songam.jpg",
    descriptionEn:
      "Korean comfort food in a century-old Ikseon-dong hanok. Try pork soup with rice, boiled pork or pancakes in a courtyard setting.",
    summaryEn:
      "Korean comfort food in a century-old Ikseon-dong hanok. Try pork soup with rice, boiled pork or pancakes in a courtyard setting. A full meal to pair with a walk through the surrounding lanes.",
    descriptionKo:
      "오래된 익선동 한옥에서 한식을 즐기는 식당이에요. 돼지국밥과 수육, 전 등 다양한 한식 메뉴를 살펴볼 수 있습니다.",
    summaryKo:
      "오래된 익선동 한옥에서 한식을 즐기는 식당이에요. 돼지국밥과 수육, 전 등 다양한 한식 메뉴를 살펴볼 수 있습니다. 골목 산책 사이에 든든한 한 끼를 먹고 싶을 때 골라보세요.",
    address: "서울 종로구 돈화문로11나길 31-3",
    lat: 37.5740007894615,
    lng: 126.99004450024,
    sourceUrl:
      "https://english.visitseoul.net/restaurants/SongamOnban/ENPhrnovc",
    imageCredit: "Visit Seoul",
  },
  {
    id: "gowundon",
    name: "Gowundon Ikseon",
    koreanName: "고운돈 익선점",
    area: "ikseon",
    category: "food",
    image: "/assets/local/gowundon.jpg",
    descriptionEn:
      "A Korean barbecue restaurant built around a hanok and its yard. Charcoal-grilled pork, minari bossam and cold noodles are among its dishes.",
    summaryEn:
      "A Korean barbecue restaurant built around a hanok and its yard. Charcoal-grilled pork, minari bossam and cold noodles are among its dishes. Share a meal before continuing an evening in Ikseon-dong.",
    descriptionKo:
      "한옥과 마당을 활용한 익선동 고깃집이에요. 숯불 삼겹살과 미나리 보쌈, 냉면 등 한식 메뉴를 즐길 수 있습니다.",
    summaryKo:
      "한옥과 마당을 활용한 익선동 고깃집이에요. 숯불 삼겹살과 미나리 보쌈, 냉면 등 한식 메뉴를 즐길 수 있습니다. 함께 식사한 뒤 익선동 저녁 산책을 이어가 보세요.",
    address: "서울 종로구 수표로28길 23-6",
    lat: 37.5730733906709,
    lng: 126.989988136881,
    sourceUrl: "https://english.visitseoul.net/restaurants/gowoondon/ENPj6enzc",
    imageCredit: "Visit Seoul",
  },
  {
    id: "highwaist",
    name: "Café Highwaist",
    koreanName: "카페 하이웨스트 익선점",
    area: "ikseon",
    category: "cafe",
    image: "/assets/local/highwaist.jpg",
    descriptionEn:
      "White walls and hanok details frame this Ikseon-dong dessert café. Cakes and scones fill the displays, including playful teddy-shaped pastries.",
    summaryEn:
      "White walls and hanok details frame this Ikseon-dong dessert café. Cakes and scones fill the displays, including playful teddy-shaped pastries. Browse the desserts and enjoy a coffee break between your neighborhood walks.",
    descriptionKo:
      "흰 벽과 한옥이 어우러진 익선동 디저트 카페예요. 케이크와 스콘, 곰돌이 모양의 디저트를 진열대에서 골라볼 수 있습니다.",
    summaryKo:
      "흰 벽과 한옥이 어우러진 익선동 디저트 카페예요. 케이크와 스콘, 곰돌이 모양의 디저트를 진열대에서 골라볼 수 있습니다. 골목을 둘러보는 중 커피와 달콤한 디저트로 쉬어 가세요.",
    address: "서울 종로구 돈화문로11다길 18",
    lat: 37.5731322825305,
    lng: 126.990683064504,
    sourceUrl:
      "https://english.visitseoul.net/restaurants/CafeHighwaistIkseon/ENP038783",
    imageCredit: "Visit Seoul",
  },
  {
    id: "chatteul",
    name: "Cha Masineun Tteul",
    koreanName: "차마시는뜰",
    area: "bukchon",
    category: "cafe",
    image: "/assets/local/chatteul.jpg",
    descriptionEn:
      "A traditional teahouse with floor tables inside a Bukchon hanok. Korean teas and fruit teas come with snacks that complement a tea break.",
    summaryEn:
      "A traditional teahouse with floor tables inside a Bukchon hanok. Korean teas and fruit teas come with snacks that complement a tea break. Make it a pause while exploring the wooden houses and lanes nearby.",
    descriptionKo:
      "북촌 한옥에서 좌식 테이블에 앉아 차를 즐기는 찻집이에요. 전통차와 과일차, 차에 곁들이기 좋은 간식을 살펴볼 수 있습니다.",
    summaryKo:
      "북촌 한옥에서 좌식 테이블에 앉아 차를 즐기는 찻집이에요. 전통차와 과일차, 차에 곁들이기 좋은 간식을 살펴볼 수 있습니다. 한옥 골목을 걷다가 잠시 앉아 쉬어 가보세요.",
    address: "서울 종로구 북촌로11나길 26",
    lat: 37.5822190175845,
    lng: 126.982274443699,
    sourceUrl: "https://english.visitseoul.net/restaurants/Cha-teul/ENP139gfg",
    imageCredit: "Visit Seoul",
  },
  {
    id: "beautifultea",
    name: "Beautiful Tea Room",
    koreanName: "아름다운 차박물관 찻집",
    area: "insa",
    category: "cafe",
    image: "/assets/local/beautifultea.jpg",
    descriptionEn:
      "A tea room inside the Beautiful Tea Museum in an Insadong hanok. Explore teas from Korea and other countries alongside displays of tea culture and ceramics.",
    summaryEn:
      "A tea room inside the Beautiful Tea Museum in an Insadong hanok. Explore teas from Korea and other countries alongside displays of tea culture and ceramics. Choose a cup of tea during a stroll through the neighborhood’s craft shops.",
    descriptionKo:
      "인사동 한옥에 자리한 아름다운 차박물관 안의 찻집이에요. 한국과 여러 나라의 차를 살펴보며 차 문화와 도자기도 함께 둘러볼 수 있습니다.",
    summaryKo:
      "인사동 한옥에 자리한 아름다운 차박물관 안의 찻집이에요. 한국과 여러 나라의 차를 살펴보며 차 문화와 도자기도 함께 둘러볼 수 있습니다. 공예 상점을 구경하는 산책 중 차 한 잔을 골라보세요.",
    address: "서울 종로구 인사동길 19-11",
    lat: 37.572359,
    lng: 126.985859,
    sourceUrl:
      "https://english.visitseoul.net/attractions/Beautiful-Tea-Museum/ENP004467",
    imageCredit: "Visit Seoul",
  },
  {
    id: "sujebi",
    name: "Samcheong-dong Sujebi",
    koreanName: "삼청동수제비",
    area: "bukchon",
    category: "food",
    image: "/assets/local/sujebi.jpg",
    descriptionEn:
      "Handmade sujebi served in an earthenware pot on Samcheong-ro. Potato, zucchini and seaweed add texture to the warm dough-flake soup.",
    summaryEn:
      "Handmade sujebi served in an earthenware pot on Samcheong-ro. Potato, zucchini and seaweed add texture to the warm dough-flake soup. Pair it with a potato pancake for a Korean meal near the Bukchon lanes.",
    descriptionKo:
      "삼청로에서 항아리에 담긴 손수제비를 즐기는 식당이에요. 감자와 애호박, 김을 넣은 따뜻한 국물이 특징입니다.",
    summaryKo:
      "삼청로에서 항아리에 담긴 손수제비를 즐기는 식당이에요. 감자와 애호박, 김을 넣은 따뜻한 국물이 특징입니다. 북촌 산책 뒤 감자전과 함께 한식 한 끼를 골라보세요.",
    address: "서울 종로구 삼청로 101-1",
    lat: 37.5846110994267,
    lng: 126.981908523675,
    sourceUrl:
      "https://english.visitseoul.net/PalaceArea/Samcheong-dongSujebi/ENPqgbap0",
    imageCredit: "Visit Seoul",
  },
  {
    id: "joseonok",
    name: "Joseonok",
    koreanName: "조선옥",
    area: "eulji",
    category: "food",
    image: "/assets/local/joseonok.jpg",
    descriptionEn:
      "A long-established Euljiro restaurant known for marinated beef short ribs. The ribs are seasoned with soy sauce, sesame oil and garlic before charcoal grilling.",
    summaryEn:
      "A long-established Euljiro restaurant known for marinated beef short ribs. The ribs are seasoned with soy sauce, sesame oil and garlic before charcoal grilling. It is a Korean barbecue option to consider while exploring the neighborhood.",
    descriptionKo:
      "양념 소갈비로 알려진 을지로의 오래된 식당이에요. 간장과 참기름, 마늘 등으로 양념한 갈비를 숯불에 구워냅니다.",
    summaryKo:
      "양념 소갈비로 알려진 을지로의 오래된 식당이에요. 간장과 참기름, 마늘 등으로 양념한 갈비를 숯불에 구워냅니다. 을지로 골목을 둘러보며 한식 고기 메뉴를 찾을 때 살펴보세요.",
    address: "서울 중구 을지로15길 6-5",
    lat: 37.56678811362037,
    lng: 126.99353003020346,
    sourceUrl:
      "https://english.visitseoul.net/restaurants/Joseonok-EN/ENP006970",
    imageCredit: "Visit Seoul",
  },
  {
    id: "dalmaji",
    name: "Dalmaji Barbecue",
    koreanName: "달맞이광장 바베큐",
    area: "eulji",
    category: "food",
    image: "/assets/local/dalmaji.jpg",
    descriptionEn:
      "A charcoal chicken barbecue spot tucked into Euljiro’s lanes. Chicken is cooked to order and served alongside draft beer in a plaza setting.",
    summaryEn:
      "A charcoal chicken barbecue spot tucked into Euljiro’s lanes. Chicken is cooked to order and served alongside draft beer in a plaza setting. Consider it for a shared evening meal after exploring central Seoul.",
    descriptionKo:
      "을지로 골목 안쪽 광장에서 숯불 바비큐를 즐기는 곳이에요. 주문 후 조리한 닭 바비큐와 생맥주를 함께 맛볼 수 있습니다.",
    summaryKo:
      "을지로 골목 안쪽 광장에서 숯불 바비큐를 즐기는 곳이에요. 주문 후 조리한 닭 바비큐와 생맥주를 함께 맛볼 수 있습니다. 도심을 둘러본 뒤 함께 저녁 식사를 할 때 살펴보세요.",
    address: "서울 중구 을지로 112-1",
    lat: 37.5658473568451,
    lng: 126.990473553367,
    sourceUrl:
      "https://english.visitseoul.net/restaurants/dalmazibbq/ENPjdhubv",
    imageCredit: "Visit Seoul",
  },
  {
    id: "sammijung",
    name: "Sammijung",
    koreanName: "삼미정",
    area: "eulji",
    category: "food",
    image: "/assets/local/sammijung.jpg",
    descriptionEn:
      "An Euljiro pork-belly restaurant with indoor and outdoor tables. Samgyeopsal is the main dish, with soybean-paste stew and fried rice available alongside it.",
    summaryEn:
      "An Euljiro pork-belly restaurant with indoor and outdoor tables. Samgyeopsal is the main dish, with soybean-paste stew and fried rice available alongside it. The outdoor setting offers a different way to experience the neighborhood’s old lanes.",
    descriptionKo:
      "실내와 야외 테이블이 있는 을지로 삼겹살집이에요. 삼겹살에 된장찌개와 볶음밥을 곁들여 즐길 수 있습니다.",
    summaryKo:
      "실내와 야외 테이블이 있는 을지로 삼겹살집이에요. 삼겹살에 된장찌개와 볶음밥을 곁들여 즐길 수 있습니다. 오래된 골목에서 야외 식사 분위기를 경험하고 싶을 때 골라보세요.",
    address: "서울 중구 을지로19길 32-6",
    lat: 37.5680222238714,
    lng: 126.995908548169,
    sourceUrl: "https://english.visitseoul.net/other/Sammijung/ENPhzb6qe",
    imageCredit: "Visit Seoul",
  },
  {
    id: "banjjak",
    name: "Banjjak Tea House",
    koreanName: "반짝반짝 빛나는",
    area: "insa",
    category: "cafe",
    image: "/assets/local/banjjak.jpg",
    descriptionEn:
      "A teahouse combining traditional Korean drinks with a contemporary setting. Choose from brewed teas, sweet rice drink or cinnamon punch.",
    summaryEn:
      "A teahouse combining traditional Korean drinks with a contemporary setting. Choose from brewed teas, sweet rice drink or cinnamon punch. Traditional crafts on display add another small discovery to an Insadong tea break.",
    descriptionKo:
      "전통차와 한국 음료를 현대적인 공간에서 즐기는 인사동 찻집이에요. 차와 식혜, 수정과 등 취향에 맞는 음료를 골라보세요.",
    summaryKo:
      "전통차와 한국 음료를 현대적인 공간에서 즐기는 인사동 찻집이에요. 차와 식혜, 수정과 등 취향에 맞는 음료를 골라보세요. 공간에 전시된 전통 공예품도 함께 둘러볼 수 있습니다.",
    address: "서울 종로구 인사동길 28-1",
    lat: 37.573257,
    lng: 126.986121,
    sourceUrl:
      "https://english.visitseoul.net/restaurants/Banjjakbanjjak-Binnaneun1/ENP014145",
    imageCredit: "Visit Seoul",
  },
  {
    id: "soseonjae",
    name: "Soseonjae",
    koreanName: "소선재",
    area: "bukchon",
    category: "food",
    image: "/assets/local/soseonjae.jpg",
    descriptionEn:
      "A small hanok restaurant on Samcheong-ro serving Korean set menus. Vegetable dishes, pancakes and leafy wraps are part of the selection.",
    summaryEn:
      "A small hanok restaurant on Samcheong-ro serving Korean set menus. Vegetable dishes, pancakes and leafy wraps are part of the selection. Make time for a sit-down meal while exploring the northern Bukchon streets.",
    descriptionKo:
      "삼청로의 작은 한옥에서 한식 정식을 즐기는 식당이에요. 채소 요리와 전, 쌈 등 다양한 메뉴를 함께 살펴볼 수 있습니다.",
    summaryKo:
      "삼청로의 작은 한옥에서 한식 정식을 즐기는 식당이에요. 채소 요리와 전, 쌈 등 다양한 메뉴를 함께 살펴볼 수 있습니다. 북촌 북쪽 거리를 둘러보는 중 앉아서 식사하는 시간을 가져보세요.",
    address: "서울 종로구 삼청로 113-1",
    lat: 37.585493,
    lng: 126.981752,
    sourceUrl: "https://english.visitseoul.net/area/Soseonjae-E/ENP012460",
    imageCredit: "Visit Seoul",
  },
  {
    id: "hanaro",
    name: "Hanaro Hwaegwan",
    koreanName: "하나로회관",
    area: "insa",
    category: "food",
    image: "/assets/local/hanaro.jpg",
    descriptionEn:
      "A long-running Insadong restaurant serving Korean dishes. Its menu includes bulgogi and Korean set meals.",
    summaryEn:
      "A long-running Insadong restaurant serving Korean dishes. Its menu includes bulgogi and Korean set meals. Consider it for a sit-down lunch or dinner between visits to the neighborhood’s galleries and craft shops.",
    descriptionKo:
      "인사동에서 오랫동안 한식을 내온 식당이에요. 불고기와 한식 정식 등 식사 메뉴를 살펴볼 수 있습니다.",
    summaryKo:
      "인사동에서 오랫동안 한식을 내온 식당이에요. 불고기와 한식 정식 등 식사 메뉴를 살펴볼 수 있습니다. 주변 갤러리와 공예 상점을 둘러보는 중 점심이나 저녁 한 끼를 골라보세요.",
    address: "서울 종로구 인사동5길 25",
    lat: 37.5721541983487,
    lng: 126.9854309742424,
    sourceUrl:
      "https://english.visitseoul.net/restaurants/Hanaro%20Hwaegwan/ENP007430",
    imageCredit: "Visit Seoul",
  },
  {
    id: "rainreport",
    name: "Rain Report Rainbow",
    koreanName: "레인리포트 레인보우",
    area: "ikseon",
    category: "cafe",
    image: "/assets/local/rainreport.jpg",
    descriptionEn:
      "A rain-themed dessert café inside an Ikseon-dong hanok. Colorful handmade desserts contrast with the monochromatic setting and indoor rain effects.",
    summaryEn:
      "A rain-themed dessert café inside an Ikseon-dong hanok. Colorful handmade desserts contrast with the monochromatic setting and indoor rain effects. Try its cloud pavlova or fruit drinks as part of a neighborhood café stop.",
    descriptionKo:
      "비가 내리는 연출이 특징인 익선동 한옥 디저트 카페예요. 차분한 색의 공간에 알록달록한 수제 디저트가 대비를 이룹니다.",
    summaryKo:
      "비가 내리는 연출이 특징인 익선동 한옥 디저트 카페예요. 차분한 색의 공간에 알록달록한 수제 디저트가 대비를 이룹니다. 구름 파블로바나 과일 음료를 골라 색다른 카페 시간을 즐겨보세요.",
    address: "서울 종로구 수표로28길 33-7",
    lat: 37.5734291136138,
    lng: 126.99010853466,
    sourceUrl:
      "https://english.visitseoul.net/restaurants/rain-report-rainbow/ENP933ykf",
    imageCredit: "Visit Seoul",
  },
];
