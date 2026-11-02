(async () => {
  const { bike, weather } = await loadData();
  const now = weather.hourly[0], ri = ridingIndex(now);
  document.getElementById("weather").innerHTML = `
    <div><div class="small">오늘의 라이딩 지수</div><div class="big">${ri}점 ${indexLabel(ri)}</div></div>
    <div>🌡️ ${now.TMP}℃</div><div>☔ 강수확률 ${now.POP}%</div>
    <div>🌧️ ${PTY_TEXT[now.PTY] ?? "-"}</div><div>💨 ${now.WSD}m/s</div><div>☁️ ${SKY_TEXT[now.SKY] ?? "-"}</div>`;
  document.getElementById("upd").textContent = `데이터 갱신: ${bike.updated}`;

  const pos = await getPosition();
  const map = L.map("map").setView([pos.lat, pos.lng], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
  L.marker([pos.lat, pos.lng]).addTo(map).bindPopup(pos.fallback ? "기본 위치(서울시청)" : "내 위치");

  bike.stations.forEach(s => {
    L.circleMarker([s.lat, s.lng], { radius: 7, color: bikeColor(s.bikes), fillOpacity: .85 })
      .addTo(map)
      .bindPopup(`<b>${s.name}</b><br>잔여 ${s.bikes}대 / 거치대 ${s.rack}<br><a href="detail.html?id=${s.id}">상세보기 →</a>`);
  });

  const near = bike.stations
    .map(s => ({ ...s, d: distKm(pos.lat, pos.lng, s.lat, s.lng), sc: stationScore(s, ri, pos) }))
    .sort((a, b) => a.d - b.d).slice(0, 10);
  document.getElementById("near").innerHTML = near.map(s => `
    <tr><td><a href="detail.html?id=${s.id}">${s.name}</a></td><td>${(s.d * 1000).toFixed(0)}m</td>
    <td><span class="dot" style="background:${bikeColor(s.bikes)}"></span>${s.bikes}대</td><td>${s.sc}</td></tr>`).join("");
})().catch(e => { document.getElementById("weather").textContent = "데이터 로드 실패: " + e; });
