/**
 * Vocabulary the Kowloon kit letters its signs with. Every ideograph that
 * appears in this file is rendered into the lettering atlas by
 * `tools/kowloon-kit-textures.py`, so keep comments in plain ASCII and
 * regenerate the atlas after adding a word.
 */

/** A phrase as lettered and its English counterpart for bilingual boards. */
export interface Phrase {
  zh: string;
  en: string;
}

/** What a business does, with the kind of premises it keeps. */
export interface Trade extends Phrase {
  sector: "medical" | "food" | "retail" | "service" | "industry";
}

/** Reads `字:ENGLISH WORDS` entries separated by semicolons. */
function phrases(list: string): Phrase[] {
  return list.split(";").map((entry) => {
    const [zh, en] = entry.trim().split(":");
    return { zh, en };
  });
}

/** Two-character shop names with their Cantonese romanization. */
export const SHOP_NAMES: Phrase[] = phrases(
  "永安:WING ON; 新興:SUN HING; 福記:FOOK KEE; 陳記:CHAN KEE; 祥興:CHEUNG HING; 金龍:KAM LUNG; " +
    "和平:WO PING; 大眾:TAI CHUNG; 榮華:WING WAH; 廣源:KWONG YUEN; 明記:MING KEE; 德昌:TAK CHEONG; " +
    "合利:HOP LEE; 萬昌:MAN CHEONG; 順發:SHUN FAT; 泰來:TAI LOY; 富山:FU SHAN; 美華:MEI WAH; " +
    "利民:LEE MAN; 同益:TUNG YICK; 義興:YEE HING; 光明:KWONG MING; 東方:TUNG FONG; 長城:CHEUNG SHING; " +
    "九龍:KOWLOON; 龍城:LUNG SHING; 天寶:TIN PO; 百利:PAK LEE; 興隆:HING LUNG; 昌記:CHEONG KEE; " +
    "李記:LEE KEE; 黃記:WONG KEE; 何記:HO KEE; 梁記:LEUNG KEE; 林記:LAM KEE; 三興:SAM HING; " +
    "永祥:WING CHEUNG; 寶華:PO WAH; 聯發:LUEN FAT; 仁和:YAN WO",
);

/** Family names for practitioners who trade under their own name. */
export const SURNAMES: Phrase[] = phrases(
  "陳:CHAN; 李:LEE; 張:CHEUNG; 黃:WONG; 何:HO; 梁:LEUNG; 林:LAM; 吳:NG; 劉:LAU; 鄭:CHENG; 周:CHOW; 王:WONG; 葉:YIP; 蘇:SO",
);

/** Two-character given names. */
export const GIVEN_NAMES: Phrase[] = phrases(
  "志明:CHI MING; 國強:KWOK KEUNG; 家輝:KA FAI; 偉文:WAI MAN; 德華:TAK WAH; 永康:WING HONG; " +
    "少芬:SIU FAN; 麗珍:LAI CHUN; 錦榮:KAM WING; 耀祖:YIU CHO; 兆基:SIU KEI; 炳南:PING NAM",
);

const trades = (sector: Trade["sector"], list: string): Trade[] =>
  phrases(list).map((phrase) => ({ ...phrase, sector }));

/** Trades found in and around the Walled City, by sector. */
export const TRADES: Trade[] = [
  ...trades(
    "medical",
    "牙科:DENTIST; 牙醫:DENTIST; 診所:CLINIC; 西醫:PHYSICIAN; 中醫:HERBALIST; 跌打:BONESETTER; 藥行:MEDICINE CO; 藥房:DISPENSARY",
  ),
  ...trades(
    "food",
    "茶樓:TEA HOUSE; 冰室:CAFE; 麵家:NOODLES; 粥麵:CONGEE NOODLES; 燒臘:ROAST MEATS; 飯店:RESTAURANT; " +
      "餅家:BAKERY; 涼茶:HERBAL TEA; 茶餐廳:CAFE; 酒家:RESTAURANT; 海味:DRIED SEAFOOD; 米舖:RICE SHOP",
  ),
  ...trades(
    "retail",
    "士多:STORE; 雜貨:GROCERY; 五金:HARDWARE; 電器:ELECTRICAL; 鐘錶:WATCHES; 玩具:TOYS; 文具:STATIONERY; " +
      "鞋店:SHOES; 眼鏡:OPTICIAN; 香燭:JOSS STICKS; 大押:PAWN SHOP",
  ),
  ...trades(
    "service",
    "洋服:TAILOR; 理髮:BARBER; 髮廊:HAIR SALON; 洗衣:LAUNDRY; 印刷:PRINTING; 影相:PHOTO STUDIO; 裁縫:TAILOR; 麻雀館:MAHJONG",
  ),
  ...trades(
    "industry",
    "製衣:GARMENTS; 魚蛋:FISH BALLS; 糖果:CANDY; 塑膠:PLASTICS; 粉麵廠:NOODLE FACTORY; 肉食:MEAT CO; 五金廠:METAL WORKS; 織造:WEAVING",
  ),
];

/** How a practitioner styles the trade after a personal name. */
export const PRACTITIONER_TITLES: Record<string, Phrase[]> = {
  牙科: phrases("牙科醫生:DENTAL SURGEON; 牙醫:DENTIST"),
  牙醫: phrases("牙科醫生:DENTAL SURGEON; 牙醫:DENTIST"),
  診所: phrases("醫生:PHYSICIAN; 醫務所:CLINIC"),
  西醫: phrases("醫生:PHYSICIAN; 西醫:PHYSICIAN"),
  中醫: phrases("中醫師:HERBALIST; 醫師:HERBALIST"),
  跌打: phrases("跌打醫師:BONESETTER; 醫師:BONESETTER"),
};

/** Short lines a board carries beside its title, by sector. */
export const TAGLINES: Record<Trade["sector"], string[]> = {
  medical: ["脫牙鑲牙", "鑲牙補牙", "內外全科", "男婦兒科", "專醫奇難雜症", "駐診"],
  food: ["歡迎光臨", "冷氣開放", "馳名", "老字號", "包辦筵席"],
  retail: ["批發零售", "貨真價實", "薄利多銷", "老字號", "歡迎光臨"],
  service: ["歡迎光臨", "冷氣開放", "老字號", "服務週到"],
  industry: ["批發零售", "來料加工", "廠價發售", "有限公司"],
};

/** Words that qualify a title: a company or branch suffix, the telephone, a floor, and the way up to it. */
export const SUFFIXES = { company: "公司", branch: "分店", phone: "電話", floor: "樓", up: "請上" };

/** Numerals for floors, indexed by their value; index 0 is unused. */
export const NUMERALS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
