(async () => {
  const { bike, weather } = await loadData();
  // 1) 구별 평균 잔여율 = 평균(잔여/거치대)
  const agg = {};
  bike.stations.forEach(s => {
    if (!s.rack) return;
    const g = guOf(s); (agg[g] ??= []).push(Math.min(1, s.bikes / s.rack));
  });
  const gus = Object.keys(agg).sort((a, b) => avg(agg[b]) - avg(agg[a]));
  function avg(a) { return a.reduce((x, y) => x + y, 0) / a.length * 100; }
  new Chart(guChart, { type: "bar",
    data: { labels: gus, datasets: [{ label: "평균 잔여율(%)", data: gus.map(g => avg(agg[g]).toFixed(1)), backgroundColor: "#1b8a3e" }] } });

  // 2) TOP 10 (현재 위치 + 가중치 기반)
  const pos = await getPosition(), ri = ridingIndex(weather.hourly[0]);
  const top = bike.stations.map(s => ({ ...s, sc: stationScore(s, ri, pos) }))
    .sort((a, b) => b.sc - a.sc).slice(0, 10);
  document.getElementById("top").innerHTML = top.map((s, i) =>
    `<tr><td>${i + 1}</td><td><a href="detail.html?id=${s.id}">${s.name}</a></td><td>${s.bikes}대</td><td><b>${s.sc}</b></td></tr>`).join("");

  // 3) 시간대별 라이딩 지수
  new Chart(rideChart, { type: "line",
    data: { labels: weather.hourly.map(h => fmtTime(h.time)),
      datasets: [{ label: "라이딩 지수", data: weather.hourly.map(ridingIndex), borderColor: "#1b8a3e", tension: .3, fill: false },
                 { label: "강수확률(%)", data: weather.hourly.map(h => h.POP), borderColor: "#3498db", borderDash: [5, 5] }] },
    options: { scales: { y: { min: 0, max: 100 } } } });
})();
