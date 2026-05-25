// sketch.js

let rainData = [];
let isLoading = true;
let errorMessage = "";
let lastUpdateTime = "";

// Mappa 相關變數
let mappa;
let myMap;
let canvas;

function setup() {
  // 設定全螢幕畫布
  canvas = createCanvas(windowWidth, windowHeight);
  
  // 初始化 Mappa (使用 Leaflet 作為底圖)
  mappa = new Mappa('Leaflet');
  
  // 設定地圖初始中心點 (台北市) 與縮放級別
  const options = {
    lat: 25.06,
    lng: 121.55,
    zoom: 12,
    style: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };
  
  // 建立地圖並疊加到 p5.js 畫布的底層
  myMap = mappa.tileMap(options);
  myMap.overlay(canvas);

  // 首次載入資料
  fetchRainData();
  
  // 設定每 10 分鐘 (600000 毫秒) 自動重新抓取一次資料，確保資料為即時狀態
  setInterval(fetchRainData, 600000);
}

function draw() {
  // 注意：這裡使用 clear() 而不是 background()，這樣才看得見下方的地圖
  clear();
  
  // 顯示載入中或錯誤訊息
  if (isLoading && rainData.length === 0) {
    fill(0, 150);
    rect(0, 0, width, height);
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("載入台北市即時雨量資料中...", width / 2, height / 2);
    return;
  }
  
  if (errorMessage !== "") {
    fill(0, 150);
    rect(0, 0, width, height);
    fill(255, 100, 100);
    textSize(20);
    textAlign(CENTER, CENTER);
    text(errorMessage, width / 2, height / 2);
    return;
  }
  
  // 繪製標題與最後更新時間的半透明背景底框
  fill(30, 35, 45, 200);
  noStroke();
  rect(10, 10, 300, 80, 10);
  
  textAlign(LEFT, TOP);
  fill(100, 200, 255);
  textSize(24);
  text("台北市即時雨量資料", 25, 20);
  
  fill(200);
  textSize(14);
  text(`最後更新時間: ${lastUpdateTime}`, 25, 55);
  
  // 宣告變數來記錄滑鼠目前懸停的測站
  let hoveredStation = null;
  let hoveredPos = null;
  let hoveredSize = 0;

  // 在地圖上標示各點的站名與雨量
  for (let i = 0; i < rainData.length; i++) {
    let station = rainData[i];
    
    // 嘗試從資料中取得經緯度 (包含常見大小寫變化與 TWD97/WGS84 欄位命名)
    let lat = parseFloat(station.lat || station.latitude || station.Lat || station.wgs84aX);
    let lon = parseFloat(station.lon || station.longitude || station.Lon || station.wgs84aY);
    
    // 為了預防該 API 如果不包含經緯度，這裡使用假座標進行測試分佈，確保畫面不報錯
    // 若確認 API 中帶有座標，建議可將此 if 區塊刪除
    if (isNaN(lat) || isNaN(lon)) {
      let stName = station.stationName || station.StationName || station.name || "未知測站";
      let pseudoRandom1 = (stName.charCodeAt(0) || 0) % 10;
      let pseudoRandom2 = (stName.charCodeAt(stName.length - 1) || 0) % 10;
      lat = 25.02 + pseudoRandom1 * 0.01;
      lon = 121.50 + pseudoRandom2 * 0.01;
    }
    
    // 透過 Mappa 將經緯度轉換為畫布上的 XY 座標
    const pos = myMap.latLngToPixel(lat, lon);
    
    // 判斷該點座標存在且大致在目前螢幕畫面內
    if (pos && pos.x > -50 && pos.x < width + 50 && pos.y > -50 && pos.y < height + 50) {
      let rain10m = station.rain10mins || station.Rain10mins || station.rain || "0";
      let rainVal = parseFloat(rain10m);
      
      // 依據雨量改變標記顏色與大小
      let markerColor = color(0, 150, 255, 150); // 預設為藍色 (無雨或微雨)
      if (rainVal > 10) markerColor = color(255, 50, 50, 180); // 大於 10mm 以紅色警告
      else if (rainVal > 0) markerColor = color(255, 200, 50, 180); // 有雨則顯示黃橘色
      
      let size = constrain(15 + rainVal * 2, 15, 50); 
      
      // 1. 畫出測站點位
      fill(markerColor);
      stroke(255);
      strokeWeight(2);
      ellipse(pos.x, pos.y, size, size);
      
      // 使用 dist() 判斷滑鼠座標與圓點中心的距離是否小於半徑
      if (dist(mouseX, mouseY, pos.x, pos.y) < size / 2) {
        hoveredStation = station;
        hoveredPos = pos;
        hoveredSize = size;
      }
    }
  }
  
  // 繪製右下角的雨量分級圖例
  let legendWidth = 140;
  let legendHeight = 120;
  let legendX = width - legendWidth - 20;
  let legendY = height - legendHeight - 20;
  
  fill(30, 35, 45, 200);
  noStroke();
  rect(legendX, legendY, legendWidth, legendHeight, 10);
  
  textAlign(LEFT, CENTER);
  textSize(14);
  fill(255);
  text("雨量分級", legendX + 20, legendY + 25);
  
  // 等級 1: 大於 10mm (紅色)
  fill(255, 50, 50, 180);
  stroke(255);
  strokeWeight(2);
  ellipse(legendX + 25, legendY + 55, 18, 18);
  fill(200);
  noStroke();
  text("> 10 mm", legendX + 45, legendY + 55);
  
  // 等級 2: 大於 0mm (黃橘色)
  fill(255, 200, 50, 180);
  stroke(255);
  strokeWeight(2);
  ellipse(legendX + 25, legendY + 85, 15, 15);
  fill(200);
  noStroke();
  text("> 0 mm", legendX + 45, legendY + 85);
  
  // 等級 3: 0 mm 無雨 (藍色)
  fill(0, 150, 255, 150);
  stroke(255);
  strokeWeight(2);
  ellipse(legendX + 25, legendY + 115, 15, 15); // 微雨或無雨保持較小尺寸
  fill(200);
  noStroke();
  text("0 mm", legendX + 45, legendY + 115);

  // 如果有測站被懸停，將其詳細資訊繪製在所有點位之上的最上層
  if (hoveredStation && hoveredPos) {
    let stName = hoveredStation.stationName || hoveredStation.StationName || hoveredStation.name || "未知測站";
    let rain10m = hoveredStation.rain10mins || hoveredStation.Rain10mins || hoveredStation.rain || "0";
    
    let infoTxt = `${stName} (${rain10m} mm)`;
    let tw = textWidth(infoTxt);
    
    rectMode(CENTER);
    fill(255, 255, 255, 230);
    noStroke();
    rect(hoveredPos.x, hoveredPos.y - hoveredSize / 2 - 15, tw + 16, 24, 5);
    
    fill(30);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(infoTxt, hoveredPos.x, hoveredPos.y - hoveredSize / 2 - 15);
    
    rectMode(CORNER);
  }
}

// 當視窗大小改變時，自動調整畫布尺寸以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 當視窗縮放時，需要通知底層地圖重新計算尺寸
  if (myMap && myMap.map) myMap.map.invalidateSize();
}

// 透過 API 取得降雨資料
async function fetchRainData() {
  // 目標 API 網址
  const targetUrl = "https://wic.gov.taipei/OpenData/API/Rain/Get?stationNo=&loginId=open_rain&dataKey=85452C1D";
  // 加上 CORS 代理伺服器來繞過瀏覽器限制
  const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
  
  try {
    // 使用 GET 請求 (fetch 預設即為 GET)
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP 狀態碼錯誤: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 處理不同可能的 JSON 結構回傳結果
    // 許多開放資料 API 會將陣列包裝在物件屬性中 (例如 data.data 或是直接回傳 array)
    if (Array.isArray(data)) {
      rainData = data;
    } else if (data && data.data && Array.isArray(data.data)) {
      rainData = data.data;
    } else if (data && data.result && Array.isArray(data.result)) {
      rainData = data.result;
    } else {
      // 如果回傳的是物件格式，則強制轉為陣列
      rainData = Object.values(data);
    }
    
    // 記錄成功抓取時間
    let now = new Date();
    lastUpdateTime = now.toLocaleTimeString('zh-TW', { hour12: false });
    
    isLoading = false;
    errorMessage = "";
    
    // 將第一筆資料印出在 Console，方便開發者確認實際的欄位名稱
    if (rainData.length > 0) {
      console.log("成功取得資料，首筆測站範例：", rainData[0]);
    }
    
  } catch (error) {
    console.error("取得雨量資料失敗:", error);
    errorMessage = "無法取得資料，請確認網路連線、API 狀態或是 CORS 限制。";
    isLoading = false;
  }
}
