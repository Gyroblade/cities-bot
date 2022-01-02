const { Telegraf, session } = require("telegraf");
const token =
  process.env.BOT_TOKEN;
const bot = new Telegraf(token);
const citiesArr = require("./cities.json"); // JSON-файл со списком городом

const WIN_CHANCE_PERCENT = -3;

bot.use(session())
//ответ бота на команду /start
bot.start(async (ctx) => {
  await init(ctx);
});
// ответ бота на любой текст
bot.on("text", async (ctx) => {
  if (!ctx.session) { // если сессия пустая - инициируем новую
    console.log(ctx.session, 'новая сессия');
    await init(ctx, ctx.update.message.text.trim());
    return
  }
  await bot_response(ctx)
});

bot.launch(); // запуск бота
// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// инициализация переменных
async function init (ctx, startCity = '') {
  ctx.session = {
      citiesSet: new Set(),
      expectedFirstChar: '',
      botLost: false,
      winChance: WIN_CHANCE_PERCENT,
      userName: ctx.update.message.from.first_name
  };
  //console.log('start', ctx.session, 'startCity>>', startCity);
  if (!startCity) { // если юзер написал что-то - сразу начинаем игру с этим словом как первым городом
    await ctx.replyWithHTML(`Начинаем новую партию, <b>${ctx.session.userName}</b>! Напиши название города 😉`);
  } else {
    await ctx.replyWithHTML(`Начинаем новую партию, <b>${ctx.session.userName}</b>! Напиши название города 😉`);
    await bot_response(ctx)
  }
};

// ответ бота
async function bot_response (ctx) {

  if (ctx.session.botLost) {
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
    ctx.session.expectedFirstChar?.length > 0 &&
    usrCity[0].toLocaleUpperCase() !== ctx.session.expectedFirstChar
  ) {
    await wait(500);
    await ctx.replyWithHTML(
      `Тебе на <b>${ctx.session.expectedFirstChar}</b>`
    );
    return;
  }
  // проверяем сэт уже названных городов
  if (ctx.session.citiesSet.has(usrCity.toLocaleUpperCase())) {
    await ctx.replyWithHTML(`<b>${usrCity}</b> - такой город уже был 😐`);
    return;
  }
  ctx.session.citiesSet.add(usrCity.toLocaleUpperCase()); // добавляем в сэт названных городов ответ юзера
  const cityLastChar = getCityLastChar(usrCity); // получаем последнюю букву города
  const citiesByChar = findCitiesByChar(citiesArr, cityLastChar); // находим все города что начинаются на эту букву
  const notNamedCities = removeExceptions(
    citiesByChar,
    ctx.session.citiesSet
  ); // убираем из выборки на ответ города что уже были
  console.log(
    "шанс выиграть>>",
    ctx.session.winChance + "%",
    "user>>",
    ctx.update.message.from.first_name
  );
  if (notNamedCities.length < 1 || tryWin(ctx.session.winChance)) {
    // если бот не нашел больше городов на букву или сработал случайный выигрыш
    await ctx.replyWithHTML(`🎉 Ты выиграл, <b>${ctx.session.userName}</b>! 🎉 Я больше не знаю городов 😏`);
    botLost = true;
    console.log(
      "notNamedCities>>",
      notNamedCities.length,
      "cityLastChar>>",
      cityLastChar
    );
    return;
  }
  ctx.session.winChance = ctx.session.winChance + 1; // увеличиваем шанс выиграть у бота
  const randomCity = getRandom(notNamedCities); // случайно выбираем из списка подходящих
  await wait(100);
  ctx.reply(randomCity); // отвечаем
  ctx.session.citiesSet.add(randomCity.toLocaleUpperCase()); // добавляем в сэт ответ бота
  console.log("citiesSet>>", ctx.session.citiesSet, 'ctx.session>>', ctx.session);
  await wait();
  ctx.session.expectedFirstChar = getCityLastChar(randomCity); // пишет последнюю букву города, который ответил бот
  ctx.replyWithHTML(`Тебе на <b>${ctx.session.expectedFirstChar}</b>`);
}

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
