import type {
  DiscoveryArea,
  DiscoveryLanguage,
  SpacePreference,
} from "./model";
export const spaceLabels: Record<SpacePreference, readonly [string, string]> = {
  hanok: ["Hanok", "한옥"],
  courtyard: ["Courtyard", "마당"],
  cozy: ["Cozy", "아늑함"],
  retro: ["Retro", "레트로"],
};
export function mapAreaLabel(
  area: DiscoveryArea,
  language: DiscoveryLanguage,
): string {
  const names: Record<
    DiscoveryArea,
    readonly [string, string, string, string]
  > = {
    all: ["All areas", "전체 지역", "全エリア", "全部区域"],
    jongno: ["Jongno", "종로", "鍾路", "钟路"],
    ikseon: ["Ikseon", "익선동", "益善洞", "益善洞"],
    insa: ["Insadong", "인사동", "仁寺洞", "仁寺洞"],
    eulji: ["Euljiro", "을지로", "乙支路", "乙支路"],
    bukchon: ["Bukchon", "북촌", "北村", "北村"],
  };
  return names[area][({ en: 0, ko: 1, ja: 2, zh: 3 } as const)[language]];
}
export const languages = ["ko", "en", "ja", "zh"] as const;
export const languageNames: Record<DiscoveryLanguage, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "简体中文",
};
export const dateLocales: Record<DiscoveryLanguage, string> = {
  ko: "ko-KR",
  en: "en-GB",
  ja: "ja-JP",
  zh: "zh-CN",
};
const copy: Record<string, readonly [string, string]> = {
  Course: ["コース", "路线"],
  "Back to map": ["地図に戻る", "返回地图"],
  "Map preview": ["地図プレビュー", "地图预览"],
  "Choose language": ["言語を選択", "选择语言"],
  "Map controls": ["地図の操作", "地图操作"],
  "Fit course": ["コース全体を表示", "显示完整路线"],
  "Fit places": ["おすすめの場所をすべて表示", "显示所有推荐地点"],
  "Drag to resize · use up and down arrow keys": [
    "ドラッグするか上下の矢印キーで高さを変更",
    "拖动或使用上下方向键调整高度",
  ],
  "Search this area": ["このエリアで再検索", "在此区域重新搜索"],
  "Map area": ["地図で選択", "地图选区"],
  "Apply filters": ["条件を適用", "应用条件"],
  "Include a café": ["カフェを含める", "加入咖啡馆"],
  "Include shopping": ["お店巡りを含める", "加入逛店"],
  "No shops nearby": ["近くに立ち寄れるお店がありません", "附近没有合适的店铺"],
  "Short walks": ["歩く距離を短く", "少走路"],
  "No shops nearby. Try choosing a caf\u00e9.": [
    "近くにお店がありません。カフェを選んでください。",
    "附近没有适合逛的店铺，试试选择咖啡馆。",
  ],
  "Stop skipped": ["立ち寄り先をスキップ", "跳过此站"],
  "No matching places nearby": [
    "近くに条件に合う場所がありません",
    "附近没有符合条件的地点",
  ],
  "No other places nearby": [
    "近くに代わりの場所がありません",
    "附近没有可替换的地点",
  ],
  "No places with confirmed hours": [
    "営業時間が合う場所が見つかりませんでした",
    "没有找到营业时间合适的地点",
  ],
  "Try rebuilding to check other places": [
    "コースを作り直して別の場所を探してください",
    "重新生成路线以查找其他地点",
  ],
  "Could not check hours. Try again shortly.": [
    "営業時間を確認できませんでした。少し待って再試行してください。",
    "无法验证营业时间，请稍后重试。",
  ],
  "Skipped to keep the route walkable": [
    "徒歩でつなげにくい立ち寄り先をスキップしました",
    "已跳过步行不便的地点",
  ],
  "Could not update the course": [
    "コースを更新できませんでした",
    "无法更新路线",
  ],
  "Change from this time": ["この時間帯から変更", "从此时段重新选择"],
  "Change from here": ["ここから変更", "从这里重选"],
  "Est. walk": ["徒歩約", "预计步行"],
  " min": ["分", "分钟"],
  Activity: ["アクティビティ", "体验活动"],
  Bar: ["バー", "酒吧"],
  Dinner: ["夕食", "晚餐"],
  "Check opening hours": ["営業時間を要確認", "需要确认营业时间"],
  "Course options": ["コースの設定", "行程安排"],
  "Course summary": ["コース概要", "路线概览"],
  Stops: ["立ち寄り先", "到访地点"],
  "Open in Google Maps": ["Google マップで開く", "在 Google 地图中打开"],
  "View places in Google Maps": [
    "Google マップで場所一覧を表示",
    "在 Google 地图中查看地点列表",
  ],
  "Open each place in Google Maps": [
    "各場所を Google マップで開く",
    "在 Google 地图中逐个打开地点",
  ],
  "View course": ["コースを見る", "查看路线"],
  "Recommended course": ["おすすめコース", "推荐路线"],
  "Today's course": ["今日のコース", "今日路线"],
  Browse: ["街歩き", "逛逛"],
  "Late night": ["深夜", "深夜"],
  "Browse shops": ["街歩き・買い物", "逛店"],
  "Afternoon choice": ["午後の予定", "下午安排"],
  "Include late night": ["深夜も含める", "包含深夜"],
  "Using the selected area": [
    "選択したエリアをもとに提案します",
    "根据所选区域推荐",
  ],
  "No course for these conditions": [
    "この条件に合うコースがありません",
    "没有符合条件的路线",
  ],
  "Sample data": ["サンプルデータ", "示例数据"],
  "Back to course": ["コースに戻る", "返回路线"],
  "Visit order": ["訪問順", "游览顺序"],
  "Course map": ["コース地図", "路线地图"],
  "View map": ["地図を見る", "查看地图"],
  "Rebuild course": ["コースを作り直す", "重新生成路线"],
  "Loading course…": ["コースを読み込み中…", "正在加载路线…"],
  "Updating course…": ["コースを更新中…", "正在更新路线…"],
  "Straight-line connections": ["直線で表示", "直线连接"],
  "Straight-line total": ["直線距離の合計", "直线距离合计"],
  "Map preview unavailable": ["背景地図を表示できません", "底图暂不可用"],
  "Straight line": ["直線距離", "直线距离"],
  Attraction: ["観光スポット", "景点"],
  "AI place summary": ["AIによる店舗概要", "AI店铺简介"],
  "AI summary is unavailable.": [
    "AIによる概要はありません。",
    "暂无 AI 简介。",
  ],
  "Generated with Gemini": ["Geminiで自動生成", "由 Gemini 自动生成"],
  "Gemini is writing the summary…": [
    "Gemini が概要を作成中…",
    "Gemini 正在生成简介…",
  ],
  "Business info": ["店舗情報", "商家信息"],
  Rating: ["評価", "评分"],
  Phone: ["電話", "电话"],
  Website: ["ウェブサイト", "网站"],
  "Opening hours": ["営業時間", "营业时间"],
  "LG U+ · Relative visits by time of day in the surrounding 50 m cell": [
    "LG U+ · 周辺50m区画の時間帯別相対来訪指標",
    "LG U+ · 周边50米网格的分时相对到访指标",
  ],
  "Loading photos…": ["写真を読み込み中…", "正在加载照片…"],
  "Loading places…": ["お店を読み込み中…", "正在加载店铺…"],
  "Could not load places": ["お店を読み込めませんでした", "无法加载店铺"],
  "Try again": ["再試行", "重试"],
  "Place unavailable": ["お店の情報が見つかりません", "未找到店铺信息"],
  Café: ["カフェ", "咖啡馆"],
  Restaurant: ["レストラン", "餐厅"],
  Today: ["今日", "今天"],
  Now: ["今", "现在"],
  "Current location": ["現在地", "当前位置"],
  "Choose area": ["エリアを選択", "选择区域"],
  "Choose visit time": ["訪問時間を選択", "选择到访时间"],
  Filters: ["絞り込み", "筛选"],
  "Place type": ["お店の種類", "场所类型"],
  All: ["すべて", "全部"],
  Cafés: ["カフェ", "咖啡馆"],
  Restaurants: ["レストラン", "餐厅"],
  Close: ["閉じる", "关闭"],
  "Back to filters": ["絞り込みに戻る", "返回筛选"],
  "AI summary": ["AIによる要約", "AI 摘要"],
  "Open menu": ["言語を選択", "选择语言"],
  "Search places": ["お店を検索", "搜索店铺"],
  "Suggested places": ["検索候補", "搜索建议"],
  "Clear search": ["検索をクリア", "清除搜索"],
  "Back to places": ["一覧に戻る", "返回列表"],
  "Address copied": ["住所をコピーしました", "地址已复制"],
  "Place information": ["お店の情報", "店铺信息"],
  "Original source": ["元の情報を見る", "查看原始信息"],
  Photo: ["写真", "照片"],
  "View on map": ["地図で見る", "在地图上查看"],
  "Search results": ["検索結果", "搜索结果"],
  Nearby: ["近くのお店", "附近店铺"],
  "No places found": ["該当するお店がありません", "未找到店铺"],
  "Try another area or filter.": [
    "エリアや条件を変えてみてください。",
    "请尝试更换区域或筛选条件。",
  ],
  "Reset filters": ["条件をリセット", "重置筛选"],
  "Selected area": ["選択したエリア", "已选区域"],
  "Overlapping places": ["重なっている場所", "重叠地点"],
  "Show all": ["すべて表示", "显示全部"],
  "Edit filters": ["条件を変更", "更改筛选"],
  "Main navigation": ["メインナビゲーション", "主导航"],
  Places: ["お店", "店铺"],
  Map: ["地図", "地图"],
  "Close dialog": ["画面を閉じる", "关闭窗口"],
  Area: ["エリア", "区域"],
  "Visit time": ["訪問時間", "到访时间"],
  Menu: ["メニュー", "菜单"],
  "Finding you…": ["現在地を確認中…", "正在定位…"],
  "Use my location": ["現在地に戻る", "返回当前位置"],
  "Area activity": ["街の雰囲気", "街区氛围"],
  Ambience: ["雰囲気", "氛围"],
  Space: ["空間", "空间"],
  Clear: ["解除", "清除"],
  "Multiple choices": ["複数選択可", "可多选"],
  Reset: ["リセット", "重置"],
  Hanok: ["韓屋", "韩屋"],
  Courtyard: ["庭", "庭院"],
  Cozy: ["居心地のよさ", "温馨"],
  Retro: ["レトロ", "复古"],
  "Choose a cell": ["区画を選択", "选择网格"],
  "Show grouped places": ["重なっている場所を表示", "显示重叠地点"],
  Any: ["指定なし", "不限"],
  "Less busy": ["ゆったり", "悠闲"],
  Lively: ["にぎやか", "热闹"],
  "Show places": ["お店を表示", "查看店铺"],
  Day: ["日付", "日期"],
  Time: ["時間帯", "时段"],
  "Use current time": ["現在の時間に戻す", "使用当前时间"],
  Apply: ["適用", "应用"],
  Settings: ["設定", "设置"],
  Language: ["言語", "语言"],
  Location: ["現在地", "位置"],
  "Location is unavailable. Choose an area.": [
    "現在地を利用できません。エリアを選択してください。",
    "无法获取位置，请选择区域。",
  ],
  "This preview covers central Seoul.": [
    "このプレビューの対象はソウル中心部です。",
    "此预览涵盖首尔市中心。",
  ],
  "Choose an area, or allow location in your browser.": [
    "エリアを選ぶか、ブラウザの位置情報を許可してください。",
    "请选择区域，或允许浏览器使用位置信息。",
  ],
  "Places on map": ["地図上のお店", "地图上的店铺"],
  "Change sheet height": ["一覧の高さを変更", "调整列表高度"],
  "Drag to resize use up and down arrow keys": [
    "ドラッグ、または上下キーで高さを変更",
    "拖动或使用上下方向键调整高度",
  ],
  "Map of nearby places": ["近くのお店の地図", "附近店铺地图"],
  "Map unavailable": ["地図を表示できません", "暂时无法显示地图"],
  "Loading map…": ["地図を読み込み中…", "正在加载地图…"],
  "The place list is available below.": [
    "下のお店一覧は引き続き利用できます。",
    "仍可使用下方的店铺列表。",
  ],
  "Show 50m cell preview": ["50m区画を表示", "查看50米网格"],
  "Zoom in": ["拡大", "放大"],
  "Zoom out": ["縮小", "缩小"],
  "Retry live map": ["地図を再読み込み", "重新加载地图"],
  "Show all recommended locations": [
    "すべてのお店を地図に表示",
    "在地图上查看全部推荐店铺",
  ],
  "My location": ["現在地", "我的位置"],
  "Allow location in your browser to use this button.": [
    "このボタンを使うには、ブラウザで位置情報を許可してください。",
    "请在浏览器中允许使用位置信息。",
  ],
  "Could not find your location. Try again.": [
    "現在地を取得できませんでした。もう一度お試しください。",
    "无法获取您的位置，请重试。",
  ],
  "Previous photo": ["前の写真", "上一张照片"],
  "Next photo": ["次の写真", "下一张照片"],
  "Place photos": ["お店の写真", "店铺照片"],
  Exterior: ["外観", "外观"],
  Interior: ["店内", "室内"],
  "Food and drinks": ["料理・ドリンク", "餐饮"],
  "More places": ["ほかのお店", "更多店铺"],
  "About this place": ["お店について", "关于这家店"],
  "Getting there": ["アクセス", "交通位置"],
};
export function localText(
  language: DiscoveryLanguage,
  english: string,
  korean: string,
): string {
  if (language === "ko") return korean;
  if (language === "en") return english;
  return copy[english]?.[language === "ja" ? 0 : 1] ?? english;
}
export function placeCount(
  language: DiscoveryLanguage,
  count: number,
  action = false,
): string {
  if (language === "ko") return `장소 ${count}곳${action ? " 보기" : ""}`;
  if (language === "ja") return `${count}件のお店${action ? "を表示" : ""}`;
  if (language === "zh") return `${action ? "查看" : ""}${count}家店铺`;
  return `${action ? "Show " : ""}${count} ${count === 1 ? "place" : "places"}`;
}
// Based on the existing venue descriptions; venue names and Korean street addresses stay in their source form.
const placeCopy: Record<string, readonly [string, string]> = {
  cheongsudang: [
    "竹林と石畳、水の流れをたどると韓屋の中庭が広がります。益善洞の路地を歩く合間に、コーヒーやデザートでひと休みできるカフェです。中庭の雰囲気も楽しめるよう、少し余裕を持って立ち寄ってみてください。",
    "沿着竹林、石板路和水流走进店内，就能看到韩屋庭院。逛益善洞小巷时，可以在这里用咖啡和甜点稍作休息。不妨留一点时间，慢慢感受庭院的氛围。",
  ],
  seoulcoffee: [
    "古い韓屋の風合いとモダンな空間が重なるカフェです。益善洞の路地散策の途中に、コーヒーとデザートを楽しめます。木の梁や中庭にも目を向けてみてください。",
    "这家咖啡馆将老韩屋的质感与现代空间融为一体。漫步益善洞小巷时，可以来这里喝咖啡、吃甜点。休息之余，也可以看看木梁和庭院。",
  ],
  oncheonjip: [
    "中庭のある空間でしゃぶしゃぶを楽しめるお店です。益善洞の路地を散策した後、座ってゆっくり食事をしたいときの候補になります。最新のメニューや利用情報は、訪問前に元の情報でご確認ください。",
    "在带有庭院的空间里享用涮涮锅。逛完益善洞小巷后，想坐下来好好吃一餐时，可以考虑这里。到访前，请通过原始信息确认最新菜单和使用信息。",
  ],
  hanyakbang: [
    "乙支路の細い路地にある、ハンドドリップコーヒーと螺鈿の家具が印象的なカフェです。都心の違った表情を見つけたいときに立ち寄れます。周辺の街歩きと合わせて楽しんでみてください。",
    "这家咖啡馆藏在乙支路的狭窄小巷中，手冲咖啡与螺钿家具构成独特氛围。想寻找首尔市中心的另一面时，可以来这里看看。也适合在周边散步途中喝一杯咖啡。",
  ],
  osulloc: [
    "北村の韓屋の屋根を眺めながら、お茶とデザートを楽しめる空間です。路地散策の合間にひと休みできます。ティーテイスティングを希望する場合は、元の情報で予約の要否をご確認ください。",
    "可以一边欣赏北村韩屋的屋顶，一边享用茶与甜点。适合在小巷散步途中坐下来休息。如果想参加品茶体验，请先通过原始信息确认是否需要预约。",
  ],
  imun: [
    "じっくり煮込んだソルロンタンを出す鍾路の老舗です。仁寺洞からも近く、散策と合わせて韓国料理を楽しめます。温かいスープで食事をした後、また路地へ出かけてみてください。",
    "这是一家供应慢炖牛骨汤的钟路老店。距离仁寺洞较近，适合与周边散步安排在一起。喝一碗热汤，再继续探索附近的小巷。",
  ],
  layered: [
    "安国の韓屋にスコーンやケーキが並ぶカフェです。北村の路地へ向かう前に、デザートを選んでみてください。伝統的な外観や店内のディスプレイも楽しめます。",
    "位于安国韩屋中的咖啡馆，陈列着司康和蛋糕。前往北村小巷之前，可以先选一份甜点。传统外观和店内的甜点陈列也值得看看。",
  ],
  songam: [
    "益善洞の古い韓屋で韓国料理を楽しめるお店です。豚肉のクッパやゆで豚、チヂミなどのメニューがあります。路地散策の途中で、しっかり食事をしたいときに選んでみてください。",
    "在益善洞老韩屋中享用韩餐的餐厅。可以选择猪肉汤饭、白切猪肉、煎饼等菜品。逛小巷途中想吃一顿丰盛的正餐时，可以考虑这里。",
  ],
  gowundon: [
    "韓屋と中庭を生かした益善洞の焼肉店です。炭火焼きの豚肉やミナリのポッサム、冷麺などがあります。食事の後は、益善洞の夜の散歩へ出かけてみてください。",
    "利用韩屋和庭院空间的益善洞烤肉店。菜单包括炭烤猪肉、水芹包肉和冷面等。一起吃完饭后，还可以继续在益善洞散步。",
  ],
  highwaist: [
    "白い壁と韓屋の風合いが重なるデザートカフェです。ケーキやスコーン、クマの形のお菓子が並びます。路地散策の合間にコーヒーと甘いものを楽しめます。",
    "白色墙面与韩屋细节相映的甜点咖啡馆。陈列着蛋糕、司康和小熊造型甜点。逛小巷时，可以用咖啡和甜点休息一下。",
  ],
  chatteul: [
    "北村の韓屋で、座卓に座ってお茶を楽しめるお店です。韓国の伝統茶やフルーツティー、お茶に合うお菓子を選べます。韓屋の路地を歩く途中に立ち寄ってみてください。",
    "可以坐在北村韩屋的矮桌旁喝茶的茶馆。提供韩国传统茶、水果茶及搭配茶的小点心。漫步韩屋小巷时，不妨坐下来休息片刻。",
  ],
  beautifultea: [
    "仁寺洞の韓屋にある、美しい茶博物館内のティールームです。韓国や各国のお茶とともに、茶文化や陶磁器にも触れられます。工芸店を巡る途中に、お茶を一杯選んでみてください。",
    "位于仁寺洞韩屋内的美丽茶博物馆茶室。可以了解韩国及其他国家的茶，也能看看茶文化和陶瓷展示。逛工艺品店途中，可以来这里选一杯茶。",
  ],
  sujebi: [
    "三清路で、土鍋に入った手作りのスジェビを楽しめるお店です。じゃがいもやズッキーニ、海苔の入った温かいスープが特徴です。北村散策の後、じゃがいものチヂミと合わせてみてください。",
    "在三清路供应陶锅手工面片汤的餐厅。热汤中加入土豆、西葫芦和海苔。逛完北村后，可以搭配土豆煎饼一起享用。",
  ],
  joseonok: [
    "味付けした牛カルビで知られる乙支路の老舗です。醤油やごま油、にんにくなどで味付けしたカルビを炭火で焼きます。周辺散策と合わせて韓国の焼肉を楽しめます。",
    "以腌制牛排骨闻名的乙支路老店。排骨用酱油、香油和大蒜等调味后炭烤。探索周边街区时，可以将这里作为韩式烤肉的用餐选择。",
  ],
  dalmaji: [
    "乙支路の路地の奥にある広場で、炭火焼きチキンを楽しめるお店です。注文後に焼き上げるチキンと生ビールを合わせられます。都心を巡った後、みんなで夕食を囲む候補になります。",
    "藏在乙支路小巷广场内的炭烤鸡肉店。可以搭配现点现做的烤鸡和生啤。逛完首尔市中心后，适合一起吃晚饭。",
  ],
  sammijung: [
    "屋内と屋外に席のある、乙支路のサムギョプサル店です。豚バラ肉にテンジャンチゲや炒めご飯を合わせられます。古い路地で屋外の食事を楽しみたいときの候補です。",
    "乙支路的一家五花肉店，设有室内和室外座位。可以搭配大酱汤和炒饭享用五花肉。想体验老巷子里的户外用餐氛围时，可以考虑这里。",
  ],
  banjjak: [
    "伝統茶や韓国の飲み物をモダンな空間で楽しめる仁寺洞の茶屋です。お茶やシッケ、スジョングァなどから選べます。店内に飾られた伝統工芸品も眺めてみてください。",
    "在现代空间里供应传统茶与韩国饮品的仁寺洞茶馆。可以选择茶、甜米露或桂皮饮等饮品。店内陈列的传统工艺品也可以一起看看。",
  ],
  soseonjae: [
    "三清路の小さな韓屋で、韓国料理の定食を楽しめるお店です。野菜料理やチヂミ、葉野菜で包む料理などがあります。北村の北側を巡る途中に、座って食事をしてみてください。",
    "位于三清路小韩屋中的韩式套餐餐厅。可以享用蔬菜料理、煎饼和包饭等菜品。探索北村北侧街道时，可以安排在这里坐下来吃一餐。",
  ],
  hanaro: [
    "仁寺洞で長く韓国料理を出しているお店です。プルコギや韓国料理の定食などがあります。周辺のギャラリーや工芸店を巡る合間の昼食・夕食の候補になります。",
    "在仁寺洞经营多年的韩餐店。菜单包括烤牛肉和韩式套餐等。逛附近画廊和工艺品店时，可以作为午餐或晚餐的选择。",
  ],
  rainreport: [
    "雨の演出が特徴の、益善洞の韓屋デザートカフェです。落ち着いた色の空間にカラフルな手作りデザートが映えます。雲の形のパブロバやフルーツドリンクを楽しめます。",
    "以室内下雨效果为特色的益善洞韩屋甜点咖啡馆。色彩丰富的手工甜点与低饱和度空间形成对比。可以选择云朵造型帕芙洛娃或水果饮品。",
  ],
};
export function localizedPlaceSummary(
  id: string,
  language: DiscoveryLanguage,
): string | undefined {
  return language === "ja" || language === "zh"
    ? placeCopy[id]?.[language === "ja" ? 0 : 1]
    : undefined;
}
