//import { session, Telegraf } from "telegraf";
const { Telegraf, session } = require("telegraf");
//const session = require("telegraf/session");
//const session = require("telegraf/session");
const token =
  process.env.BOT_TOKEN || "2057680315:AAFQDheW5G1KdggcGTf9pRbMc9FDuF1-9Ac";
const bot = new Telegraf(token);
const citiesArr = require("./cities.json"); // JSON-файл со списком городом

const WIN_CHANCE_PERCENT = -1;

//let expectedFirstChar = ""; // здесь хранится буква на которую бот ждет ответа от пользователя
//const citiesSet = new Set() // здесь хранятся уже названные города
//let botLost = false;
//let winChance = WIN_CHANCE_PERCENT;

bot.use(session())
//ответ бота на команду /start
bot.start(async (ctx) => {
  //expectedFirstChar = "";
  //ctx.session.citiesSet.clear();
  //botLost = false;
  //winChance = WIN_CHANCE_PERCENT;
  ctx.session = {
    conf:{
      id: ctx.update.from.id,
      citiesSet: new Set(),
      expectedFirstChar: "",
      botLost: false,
      winChance: WIN_CHANCE_PERCENT
    }
  };
  console.log(ctx.session, ctx.update.from.id);
  await ctx.reply("Начинаем новую партию! Напиши название города 😉");
});

bot.on("text", async (ctx) => {
  if (ctx.session.conf.botLost) {
    await ctx.replyWithHTML(
      `Я проиграл! Чтобы начать новую партию, введи команду <b>/start</b>`
    );
    return;
  }
  const usrCity = ctx.update.message.text.trim(); // сообщение юзера (город)
  const isCityExist = isCityInArray(citiesArr, usrCity); // проверем есть ли такой город в JSON файле
  if (!isCityExist) {
    // если нет - выходим
    await ctx.replyWithHTML(`<b>${usrCity}</b> - не знаю такого города 😐`);
    return;
  }

  // если есть какая-то буква в глобальной переменной и она не совпадает с первой буквой города что написал юзер - выходим
  if (
    ctx.session.conf.expectedFirstChar?.length > 0 &&
    usrCity[0].toLocaleUpperCase() !== ctx.session.conf.expectedFirstChar
  ) {
    await wait(500);
    await ctx.replyWithHTML(
      `Тебе на <b>${ctx.session.conf.expectedFirstChar}</b>`
    );
    return;
  }
  // проверяем сэт уже названных городов
  if (ctx.session.conf.citiesSet.has(usrCity.toLocaleUpperCase())) {
    await ctx.replyWithHTML(`<b>${usrCity}</b> - такой город уже был 😐`);
    return;
  }
  ctx.session.conf.citiesSet.add(usrCity.toLocaleUpperCase()); // добавляем в сэт названных городов ответ юзера
  const cityLastChar = getCityLastChar(usrCity); // получаем последнюю букву города
  const citiesByChar = findCitiesByChar(citiesArr, cityLastChar); // находим все города что начинаются на эту букву
  const notNamedCities = removeExceptions(
    citiesByChar,
    ctx.session.conf.citiesSet
  ); // убираем из выборки на ответ города что уже были
  console.log(
    "шанс выиграть>>",
    ctx.session.winChance + "%",
    "user>>",
    ctx.update.message.from.first_name,
    "id>>",
    ctx.update.message.from.id
  );
  if (notNamedCities.length < 1 || tryWin(ctx.session.conf.winChance)) {
    // если бот не нашел больше городов на букву или сработал случайный выигрыш
    await ctx.replyWithHTML(`🎉 Ты выиграл! 🎉 Я больше не знаю городов 😏`);
    botLost = true;
    console.log(
      "notNamedCities>>",
      notNamedCities.length,
      "cityLastChar>>",
      cityLastChar
    );
    return;
  }
  ctx.session.conf.winChance = ctx.session.conf.winChance + 1; // увеличиваем шанс выиграть у бота
  const randomCity = getRandom(notNamedCities); // случайно выбираем из списка подходящих
  await wait(100);
  ctx.reply(randomCity); // отвечаем
  ctx.session.conf.citiesSet.add(randomCity.toLocaleUpperCase()); // добавляем в сэт ответ бота
  console.log("citiesSet>>", ctx.session.conf.citiesSet);
  await wait();
  ctx.session.conf.expectedFirstChar = getCityLastChar(randomCity); // пишет последнюю букву города, который ответил бот
  ctx.replyWithHTML(`Тебе на <b>${ctx.session.conf.expectedFirstChar}</b>`);
});

bot.launch(); // запуск бота

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

/** проверка есть ли город в массиве */
function isCityInArray(arr, cityName) {
  const result = arr.some((el) => el.toUpperCase() === cityName.toUpperCase());
  return result;
}

/** найти в массиве все города, которые начинаются на последнюю букву города - аргумента */
function findCitiesByChar(arr, char) {
  const result = arr.filter((el) => el[0].toUpperCase() === char.toUpperCase());
  return result;
}

/** получить случайное значение из массива */
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** ждать заднное время в мс */
function wait(ms = 1000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}
/** получить последнюю букву города, учитвая буквы-исключения */
function getCityLastChar(city) {
  const charExceptions = new Set(["Ъ", "Ь", /*'Й',*/ "Ы", ")"]);
  const arr = city.toUpperCase().split("");
  const newArr = arr.filter((el) => {
    return !charExceptions.has(el);
  });
  const lastChar = newArr[newArr.length - 1];
  return lastChar;
}
/** убираем исключения из массива */
function removeExceptions(arr, exSet) {
  return arr.filter((el) => !exSet.has(el));
}

/** вероятность выиграть */
function tryWin(_winChance) {
  let result = false;
  const randomNumber = Math.random() * 100;
  if (_winChance > 0 && randomNumber <= _winChance) {
    result = true;
    console.log("Выигрыш по случаю", randomNumber, _winChance + "%");
  }
  return result;
}
