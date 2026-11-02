(async () => {
  const { bike, weather } = await loadData();
  const id = new URLSearchParams(location.search).get("id");
  const st = bike.stations.find(s => s.id === id);
  const ri = ridingIndex(weather.hourly[0]);
  const pos = await getPosition();
  const w = { ...getWeights() };
  const els = { weather: [wEl("w"), wEl("vw")], distance: [wEl("d"), wEl("vd")], bikes: [wEl("b"), wEl("vb")] };
  function wEl(i) { return document.getElementById(i); }

  function renderFavs() {
    const list = getFavs().map(f => bike.stations.find(s => s.id === f)).filter(Boolean);
    favList.innerHTML = list.length ? list.map(s => `<li><a href="detail.html?id=${s.id}">${s.name}</a> (${s.bikes}대)</li>`).join("") : "<li class='small'>없음</li>";
  }
  function renderScore() { score.textContent = st ? stationScore(st, ri, pos, w) : "-"; }

  for (const [k, [range, label]] of Object.entries(els)) {
    range.value = w[k]; label.textContent = w[k];
    range.oninput = () => { w[k] = +range.value; label.textContent = range.value; renderScore(); };
  }
  save.onclick = () => { setWeights(w); alert("저장되었습니다!"); };

  if (st) {
    const ratio = st.rack ? Math.round(st.bikes / st.rack * 100) : 0;
    const fav = () => getFavs().includes(st.id) ? "★ 즐겨찾기 해제" : "☆ 즐겨찾기 등록";
    info.innerHTML = `<h2>${st.name}</h2>
      <p>정류소 ID: ${st.id} · 소속(추정): ${guOf(st)}</p>
      <p>잔여 <b style="color:${bikeColor(st.bikes)}">${st.bikes}대</b> / 거치대 ${st.rack}개 (잔여율 ${ratio}%)</p>
      <p>내 위치에서 ${distKm(pos.lat, pos.lng, st.lat, st.lng).toFixed(2)}km · 현재 라이딩 지수 ${ri}점</p>
      <button id="favBtn">${fav()}</button>`;
    favBtn.onclick = () => { toggleFav(st.id); favBtn.textContent = fav(); renderFavs(); };
    const map = L.map("map").setView([st.lat, st.lng], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    L.marker([st.lat, st.lng]).addTo(map).bindPopup(st.name).openPopup();
  } else document.getElementById("map").parentElement.style.display = "none";
  renderScore(); renderFavs();
})();
