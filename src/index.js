/*
TODO
Прикрутить ДБ

*/

const { Bot } = require('@dlghq/dialog-bot-sdk');
const QRCode = require('qrcode');
const config = require('./config');
const path = require('path');
const bot = new Bot({
  endpoints: ['wss://ws1.coopintl.com', 'wss://ws2.coopintl.com'],
  phone: '',
  code: '',
});
let state = {
  // 125134: config.admins[0],
};

function AskQuestions(bot, peer, message) {
  let keys = Object.keys(config.users[peer.id].anwsers);
  if (config.users[peer.id].i <= config.questions.length - 1) {
    config.users[peer.id].anwsers[keys[config.users[peer.id].i - 1]] =
      message.content.text;
    bot.sendTextMessage(peer, config.questions[config.users[peer.id].i]);
  }
  if (config.users[peer.id].i === config.questions.length) {
    config.users[peer.id].anwsers[keys[config.users[peer.id].i - 1]] =
      message.content.text;

    bot.sendTextMessage(
      peer,
      `
              •	Ваше ФИО - ${config.users[peer.id].anwsers.fio}
  
              •	Дата рождения - ${config.users[peer.id].anwsers.birth}
              •	Ваш регион - ${config.users[peer.id].anwsers.region}
  
              •	Ваша должность? - ${config.users[peer.id].anwsers.vacation}
  
              •	Статус - ${config.users[peer.id].anwsers.status}
              •	Сфера компетенций/интересов - ${
                config.users[peer.id].anwsers.spehre
              }
                    
                    `,
    );
    checking(bot, peer);
  }
  config.users[peer.id].i++;
}

async function checking(bot, peer) {
  //  возможность отправить ответ отключаю в onINteractiveMessage
  config.users[peer.id].verification = true;

  bot.sendInteractiveMessage(
    peer,
    'Сейчас вы можете отправить или отредактировать данные',
    [
      {
        actions: [
          {
            id: 's',
            widget: {
              type: 'button',
              value: 'complete',
              label: 'Отправить',
            },
          },
        ],
      },
      {
        actions: [
          {
            id: 's',
            widget: {
              type: 'select',
              label: 'Редактировать',
              options: [
                {
                  label: 'ФИО',
                  value: 'fio_0',
                },
                {
                  label: 'Дата рождения',
                  value: 'birth_1',
                },
                {
                  label: 'Регион',
                  value: 'region_2',
                },
                {
                  label: 'Должность',
                  value: 'vacation_3',
                },
                {
                  label: 'Статус',
                  value: 'status_4',
                },
                {
                  label: 'Сфера интересов',
                  value: 'spehre_5',
                },
              ],
            },
          },
        ],
      },
    ],
  );
}

function sendVerificationInfoToadmin(bot, peer) {
  bot.sendTextMessage(
    peer,
    'Отправили вашу информацию для потверждения, подождите пока наш администратор вас верифицирует, я вам напишу результат когда будет готово',
  );
  const adminPeer = state[config.users[peer.id].peer.id];
  config.users[peer.id].edit = false; // больше не сможет изменить инфу о себе
  bot.sendTextMessage(
    adminPeer,
    'ФИО - ' +
      config.users[peer.id].anwsers.fio +
      '\nДата рождения - ' +
      config.users[peer.id].anwsers.birth +
      '\nРегион - ' +
      config.users[peer.id].anwsers.region +
      '\nДолжность - ' +
      config.users[peer.id].anwsers.vacation +
      '\nСтатус - ' +
      config.users[peer.id].anwsers.status +
      '\nСфера компетенций - ' +
      config.users[peer.id].anwsers.spehre,
  );
  bot.sendInteractiveMessage(adminPeer, 'Потвердите данные кооператора', [
    {
      actions: [
        {
          id: 'yes',
          widget: {
            type: 'button',
            value: 'ver_true_' + JSON.stringify(config.users[peer.id].peer.id),
            label: 'Верифицировать',
          },
        },
        {
          id: 'no',
          widget: {
            type: 'button',
            value: 'ver_false_' + JSON.stringify(config.users[peer.id].peer.id),
            label: 'Отказать',
          },
        },
      ],
    },
  ]);
}

function makeQR(nickname) {
  return new Promise(function(resolve, reject) {
    QRCode.toFile(
      `./src/${nickname}_invintation.png`,
      'https://global.coop/@/' + nickname,
      {
        color: {
          dark: '#000000', // Bl dots
          light: '#F0F8FF', // Transparent background
        },
      },
      function(err) {
        if (err) reject(err);
        resolve('done');
      },
    );
  });
}

IfPeerAdmin = (peer) => {
  for (let index = 0; index < config.admins.length; index++) {
    if (peer.id !== config.admins[index].id) return true;
  }
  return false;
};

bot.onMessage(async (peer, message) => {
  // инициализируем нового юзера
  if (typeof config.users[peer.id] == 'undefined') {
    config.users[peer.id] = {
      peer: peer,
      eventNumber: null,
      i: 0,
      verified: false,
      startedButton: true,
      verification: false,
      edit: false,
      editValue: '',
      needHelp: false,
      anwsers: {
        fio: '',
        birth: '',
        region: '',
        vacation: '',
        status: '',
        spehre: '',
      },
    };
  }
  // проверка на наличие никнейма у юзера
  let user = await bot.getUser(peer.id);
  if (!user.nick) {
    bot.sendTextMessage(
      peer,
      'Прежде чем начать работу с ботом установите свой никнейм по нему вас в дальнейшем смогут находить кооператоры и к нему будет привязан ваш QRcode',
    );
  }

  // первое сообщение
  if (
    user.nick &&
    config.users[peer.id].startedButton &&
    peer.type != 'group' &&
    IfPeerAdmin(peer)
  ) {
    bot.sendInteractiveMessage(
      peer,
      'Для подтверждения аккаунта и регистрации на мероприятие все информационные поля профиля профиля должны быть заполнены. Если поля заполнены неправильно или неполностью аккаунт не будет подтвержден и зарегистрирован. В угловых скобках приводятся примеры допустимых ответов. \n Если вы хотите написать отзыв о работе чатбота, то напишите мне команду отзыв. ',
      [
        {
          actions: [
            {
              id: 's',
              widget: {
                type: 'button',
                value: 'start#0',
                label: 'Площадка#1',
              },
            },
          ],
        },
        {
          actions: [
            {
              id: 's',
              widget: {
                type: 'button',
                value: 'start#1',
                label: 'Площадка#2',
              },
            },
          ],
        },
      ],
    );
    config.users[peer.id].startedButton = false;
  }

  // задаем вопросы
  if (config.users[peer.id].verification) {
    AskQuestions(bot, peer, message);
  }
  //если пользовaтель редактирует ответы

  if (config.users[peer.id].edit) {
    let oldVal = config.users[peer.id].anwsers[config.users[peer.id].editValue];
    config.users[peer.id].anwsers[config.users[peer.id].editValue] =
      message.content.text;
    await bot.sendTextMessage(
      peer,
      JSON.stringify(
        'Изменили ' +
          config.questions[
            Object.keys(config.users[peer.id].anwsers).indexOf(
              config.users[peer.id].editValue,
            )
          ] +
          ' c ' +
          oldVal +
          ' на ' +
          config.users[peer.id].anwsers[config.users[peer.id].editValue],
      ),
    );
    checking(bot, peer);
  }

  //Переделываем QRкод если пользователь написал заново
  if (
    config.users[peer.id].verified == true &&
    message.content.text.toUpperCase() === 'ЗАНОВО'
  ) {
    makeQR(user.nick).then((result) => {
      bot.sendFileMessage(
        peer,
        path.join(__dirname, './' + user.nick + '_invintation.png'),
      );
    });
  }

  // help section
  if (
    message.content.text.toLowerCase() === 'отзыв' ||
    config.users[peer.id].needHelp === true
  ) {
    if (config.users[peer.id].needHelp) {
      bot.sendTextMessage(peer, 'Отзыв отправлен. Всего вам доброго!');

      bot.sendTextMessage(
        state[config.users[event.peer.id]],
        message.content.text,
      );
      config.users[peer.id].needHelp = false;
    } else {
      bot.sendTextMessage(peer, 'Напишите отзыв');
      config.users[peer.id].needHelp = true;
    }
  }

  if (
    message.content.text.toLowerCase() === 'мой id' ||
    message.content.text.toLowerCase() === 'vjq id'
  ) {
    bot.sendTextMessage(peer, JSON.stringify(peer));
  }
});

bot.onInteractiveEvent(async (event) => {
  if (event.value.split('#')[0] === 'start') {
    state[config.users[event.peer.id].peer.id] =
      config.admins[event.value.split('#')[1]];

    bot.sendTextMessage(event.peer, config.questions[0]);
    // начинаем верифицировать пользователя т е теперь он при отправке сообщения попадет в секцию где задаются вопросы
    config.users[String(event.peer.id)].verification = true;
    config.users[event.peer.id].i++;
  }

  if (
    event.value === 'complete' &&
    config.users[event.peer.id].verification == true
  ) {
    sendVerificationInfoToadmin(bot, event.peer);
    // больше не попадем в секцию где задаются вопросы и отключаем возможность многократно отправить админу информацию о себе
    config.users[event.peer.id].verification = false;
  } //  работает

  // ответ на селект редактирования
  if (
    event.value == 'fio_0' ||
    event.value == 'birth_1' ||
    event.value == 'region_2' ||
    event.value == 'vacation_3' ||
    event.value == 'status_4' ||
    event.value == 'spehre_5'
  ) {
    let UserSelect = event.value.split('_'); // array[fio,0]
    bot.sendTextMessage(event.peer, config.questions[UserSelect[1]]); //отсылаем вопрос под номером кнопки

    config.users[event.peer.id].edit = true; //посылаем в секцию редактирования
    config.users[event.peer.id].editValue = UserSelect[0]; // какой пункт надо изменить
  }
  //потверждение верификациN админом
  if (event.value.split('_')[0] === 'ver') {
    // let adminPeer = state[config.users[event.peer.id]];
    let adminPeer = state[1394142737];
    bot.sendTextMessage(event.peer, JSON.stringify(adminPeer));

    //
    let val = event.value.split('_'); // пример 'ver_true_' + JSON.stringify(config.users[peer.id].peer.id)
    if (val[1] === 'true') {
      //админ потвердил
      bot.sendTextMessage(adminPeer, 'Потвреждение отправлено');
      let user = await bot.getUser(config.users[val[2]].peer.id);
      config.users[val[2]].verified = true;
      //config.users[val[2]].peer - пир того кто пишет боту adminPeer - пир админа
      bot.sendTextMessage(config.users[val[2]].peer, 'Ваш аккаунт потвердили');

      if (user.nick != 'null') {
        makeQR(user.nick).then((result) => {
          bot.sendFileMessage(
            config.users[val[2]].peer,
            path.join(__dirname, './' + user.nick + '_invintation.png'),
          );
        });
        await bot.sendTextMessage(
          config.users[val[2]].peer,
          'Чтобы изменить QRcode после смены никнейма напишите заново',
        );
      } else {
        bot.sendTextMessage(
          config.users[val[2]].peer,
          'Установите никнейм в настройках',
        );
      }
    } else {
      // сообщения с этим пиром уйдут админу

      let once = false; // onMessage only once
      bot.sendTextMessage(adminPeer, 'Напишите причину отказа');
      bot.onMessage(async (adminPeer, message) => {
        if (once === false) {
          bot.sendTextMessage(
            config.users[val[2]].peer,
            'Вам отказали по причине ' +
              message.content.text +
              '\nОтредактируйте свои данные и отправьте повторно',
          );
          bot.sendTextMessage(adminPeer, 'Отказ отправлен');

          checking(bot, config.users[val[2]].peer);

          once = true; // костыль
        }
      });
    }
  }
});
