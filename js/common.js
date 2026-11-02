// ===== 공통 유틸: 데이터 로드, 라이딩 지수, 거리, 점수, 즐겨찾기/가중치 =====
const PTY_TEXT = {0:"없음",1:"비",2:"비/눈",3:"눈",4:"소나기"};
const SKY_TEXT = {1:"맑음",3:"구름많음",4:"흐림"};

async function loadData() {
  const [bike, weather] = await Promise.all([
    fetch("data/bike.json?t=" + Date.now()).then(r => r.json()),
    fetch("data/weather.json?t=" + Date.now()).then(r => r.json()),
  ]);
  return { bike, weather };
}

// 라이딩 지수(0~100): 기온 15~24℃ 최적, 강수확률·강수형태·풍속 감점
function ridingIndex(h) {
  let s = 100;
  const t = h.TMP;
  if (t < 15) s -= (15 - t) * 3; else if (t > 24) s -= (t - 24) * 4;
  s -= (h.POP || 0) * 0.4;
  if (h.PTY > 0) s -= 50;
  if (h.WSD > 4) s -= (h.WSD - 4) * 8;
  return Math.max(0, Math.min(100, Math.round(s)));
}
function indexLabel(v) {
  return v >= 80 ? "😎 최고" : v >= 60 ? "🙂 좋음" : v >= 40 ? "😐 보통" : v >= 20 ? "😣 나쁨" : "⛔ 비추천";
}

// Haversine 거리(km)
function distKm(a, b, c, d) {
  const R = 6371, r = x => x * Math.PI / 180;
  const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function bikeColor(n) { return n === 0 ? "#e74c3c" : n <= 3 ? "#f39c12" : "#27ae60"; }

// 가중치 / 즐겨찾기 (localStorage)
const DEFAULT_W = { weather: 40, distance: 30, bikes: 30 };
const getWeights = () => JSON.parse(localStorage.getItem("weights") || "null") || DEFAULT_W;
const setWeights = w => localStorage.setItem("weights", JSON.stringify(w));
const getFavs = () => JSON.parse(localStorage.getItem("favs") || "[]");
const toggleFav = id => {
  const f = getFavs(), i = f.indexOf(id);
  i >= 0 ? f.splice(i, 1) : f.push(id);
  localStorage.setItem("favs", JSON.stringify(f));
  return i < 0;
};

// 추천 점수: 날씨(라이딩지수) + 거리(2km 이상 0점) + 잔여대수(10대 이상 만점)
function stationScore(st, rideIdx, userPos, w = getWeights()) {
  const ws = rideIdx;
  const ds = userPos ? Math.max(0, 100 - distKm(userPos.lat, userPos.lng, st.lat, st.lng) * 50) : 50;
  const bs = Math.min(100, st.bikes * 10);
  const sum = w.weather + w.distance + w.bikes || 1;
  return Math.round((ws * w.weather + ds * w.distance + bs * w.bikes) / sum);
}

// 사용자 위치 (거부 시 서울시청)
function getPosition() {
  return new Promise(res => {
    const fallback = { lat: 37.5665, lng: 126.978, fallback: true };
    if (!navigator.geolocation) return res(fallback);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res(fallback), { timeout: 5000 });
  });
}

// 구 판별: API에 구 정보가 없어 25개 구청 좌표 중 최근접으로 근사
const GU = {"종로구":[37.5735,126.979],"중구":[37.5641,126.9979],"용산구":[37.5324,126.9906],"성동구":[37.5634,127.0369],"광진구":[37.5385,127.0823],"동대문구":[37.5744,127.0396],"중랑구":[37.6063,127.0927],"성북구":[37.5894,127.0167],"강북구":[37.6396,127.0257],"도봉구":[37.6688,127.0471],"노원구":[37.6542,127.0568],"은평구":[37.6027,126.9291],"서대문구":[37.5791,126.9368],"마포구":[37.5663,126.9019],"양천구":[37.517,126.8665],"강서구":[37.5509,126.8495],"구로구":[37.4954,126.8874],"금천구":[37.4568,126.8954],"영등포구":[37.5264,126.8962],"동작구":[37.5124,126.9393],"관악구":[37.4781,126.9515],"서초구":[37.4837,127.0324],"강남구":[37.5172,127.0473],"송파구":[37.5145,127.1059],"강동구":[37.5301,127.1238]};
function guOf(st) {
  let best, bd = 1e9;
  for (const [g, [a, b]] of Object.entries(GU)) {
    const d = distKm(st.lat, st.lng, a, b);
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}
const fmtTime = t => `${t.slice(4,6)}/${t.slice(6,8)} ${t.slice(8,10)}시`;
