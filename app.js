const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { DateTime } = require('luxon');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'seuSegredoAqui',
    resave: true,
    saveUninitialized: true
}));

app.use(flash());

const feriados = [
    
    '12/02/2024', '13/02/2024', '14/02/2024', '19/03/2024', '25/03/2024',
    '29/03/2024', '21/04/2024', '01/05/2024', '30/05/2024', '15/08/2024',
    '07/09/2024', '12/10/2024', '02/11/2024', '15/11/2024', '24/12/2024',
    '25/12/2024', '26/12/2024', '27/12/2024', '28/12/2024', '29/12/2024'
];

class Turma {
    constructor(nome) {
        this.nome = nome;
        this.modulos = [];
        this.primeiraData = null;
    }

    adicionarModulo(nome, dataInicio, semanas) {
        const modulo = {
            nome,
            dataInicio: dataInicio ? DateTime.fromFormat(dataInicio, 'dd/MM/yyyy') : null,
            semanas
        };

        if (!this.primeiraData && modulo.dataInicio) {
            this.primeiraData = modulo.dataInicio;
        }

        this.modulos.push(modulo);
    }

    calcularDatas() {
        if (!this.primeiraData) {
            return {}; // Se não houver primeira data, não há datas para calcular
        }

        let datasModulos = {};
        let dataAtual = this.primeiraData; // Inicie com a primeira data

        for (const modulo of this.modulos) {
            modulo.dataInicio = dataAtual; // Use a data atual como início
            modulo.dataTermino = this.calcularDataFutura(modulo.dataInicio, modulo.semanas);

            datasModulos[modulo.nome] = {
                dataInicio: modulo.dataInicio,
                dataTermino: modulo.dataTermino
            };

            dataAtual = modulo.dataTermino.plus({ weeks: 1 });
        }

        return datasModulos;
    }

    calcularDataFutura(dataInicio, semanas) {
        if (!dataInicio) {
            return null;
        }

        let dataFutura = dataInicio.plus({ weeks: semanas });

        // Considerar feriados
        while (feriados.includes(dataFutura.toFormat('dd/MM/yyyy'))) {
            dataFutura = dataFutura.plus({ days: 1 });
        }

        return dataFutura;
    }
}

const turmas = {};

app.get('/', (req, res) => {
    const flashMessages = req.flash('success');
    res.render('index', { datasTurmas: calcularDatasTurmas(), flashMessages });
});

app.post('/adicionar_modulos', (req, res) => {
    const { turmaNome, modulos } = req.body;

    if (!(turmaNome in turmas)) {
        turmas[turmaNome] = new Turma(turmaNome);
    }

    modulos.forEach(({ moduloNome, dataInicio, semanas }) => {
        turmas[turmaNome].adicionarModulo(moduloNome, dataInicio, semanas);
    });

    req.flash('success', `Módulos adicionados com sucesso para a turma ${turmaNome}`);
    res.redirect('/');
});

function calcularDatasTurmas() {
    const datasTurmas = {};

    for (const [nome, turma] of Object.entries(turmas)) {
        datasTurmas[nome] = turma.calcularDatas();
    }

    return datasTurmas;
}

app.listen(port, () => {
    console.log(`Servidor Express está ouvindo na porta ${port}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`A porta ${port} está em uso. Escolha outra porta.`);
    } else {
        console.error(`Erro ao iniciar o servidor: ${err.message}`);
    }
});
