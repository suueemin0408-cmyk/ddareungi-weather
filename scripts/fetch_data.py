"""공공데이터 수집 스크립트 (GitHub Actions 및 로컬에서 실행)
- 서울시 공공자전거 실시간 대여정보 -> data/bike.json
- 기상청 단기예보 조회서비스(data.go.kr) -> data/weather.json
환경변수: SEOUL_KEY, KMA_KEY(공공데이터포털 '일반 인증키(Decoding)')
"""
import json, os, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
SEOUL_KEY = os.environ.get("SEOUL_KEY")
KMA_KEY = os.environ.get("KMA_KEY")
OUT = os.path.join(os.path.dirname(__file__), "..", "data")

def get_json(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def fetch_bike():
    rows, start = [], 1
    while True:  # 1회 최대 1000건 -> 페이지 반복
        url = f"http://openapi.seoul.go.kr:8088/{SEOUL_KEY}/json/bikeList/{start}/{start+999}/"
        data = get_json(url)
        part = data.get("rentBikeStatus", {}).get("row", [])
        rows += part
        if len(part) < 1000: break
        start += 1000
    return [{
        "id": r["stationId"],
        "name": r["stationName"].split(".", 1)[-1].strip(),
        "lat": float(r["stationLatitude"]), "lng": float(r["stationLongitude"]),
        "rack": int(r["rackTotCnt"]), "bikes": int(r["parkingBikeTotCnt"]),
    } for r in rows if float(r["stationLatitude"]) > 0]

def base_datetime(now):
    """단기예보 발표시각(02,05,08,11,14,17,20,23시, +10분 후 제공) 중 가장 최근"""
    t = now - timedelta(minutes=10)
    hours = [h for h in (2, 5, 8, 11, 14, 17, 20, 23) if h <= t.hour]
    if not hours:
        t -= timedelta(days=1); h = 23
    else:
        h = hours[-1]
    return t.strftime("%Y%m%d"), f"{h:02d}00"

def fetch_weather(nx=60, ny=127):  # 서울시청 격자
    bd, bt = base_datetime(datetime.now(KST))
    q = urllib.parse.urlencode({"serviceKey": KMA_KEY, "pageNo": 1, "numOfRows": 1000,
        "dataType": "JSON", "base_date": bd, "base_time": bt, "nx": nx, "ny": ny})
    data = get_json("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?" + q)
    items = data["response"]["body"]["items"]["item"]
    hourly = {}
    for it in items:
        if it["category"] in ("TMP", "POP", "PTY", "WSD", "SKY"):
            k = it["fcstDate"] + it["fcstTime"]
            hourly.setdefault(k, {"time": k})[it["category"]] = float(it["fcstValue"])
    return {"base": bd + bt, "hourly": [hourly[k] for k in sorted(hourly)][:24]}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M")
    bikes = fetch_bike()
    json.dump({"updated": now, "stations": bikes}, open(f"{OUT}/bike.json", "w", encoding="utf-8"), ensure_ascii=False)
    w = fetch_weather(); w["updated"] = now
    json.dump(w, open(f"{OUT}/weather.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(f"OK {now}: stations={len(bikes)}, hours={len(w['hourly'])}")
