import CryptoJS from 'crypto-js';
import { Player } from '../../types';

// 生產環境使用 game-api.php，開發環境使用本地代理
const GAME_API_URL = import.meta.env.DEV 
  ? '/game-api/player'
  : '/game-api.php';

export const fetchPlayer = async (fid: string): Promise<Player> => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signData = `fid=${fid}&time=${timestamp}`;
  const sign = CryptoJS.MD5(`${signData}tB87#kPtkxqOS2`).toString();

  const response = await fetch(GAME_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `${signData}&sign=${sign}`,
  });
  
  if (!response.ok) {
    throw new Error('無法獲取玩家資訊');
  }

  const data = await response.json();
  
  if (data.code !== 0 || !data.data) {
    throw new Error(data.msg || '玩家不存在');
  }

  return {
    fid: data.data.fid?.toString() || fid,
    nickname: data.data.nickname || `Player_${fid}`,
    kid: data.data.kid || 0,
    stove_lv: data.data.stove_lv || 0,
    stove_lv_content: data.data.stove_lv_content || '',
    avatar_image: data.data.avatar_image || '',
    total_recharge_amount: data.data.total_recharge_amount,
    lastUpdated: Date.now()
  };
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
