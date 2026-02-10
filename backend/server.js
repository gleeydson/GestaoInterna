const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const db = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Suporte a múltiplas origens CORS
const CORS_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem origin (ex: file://, Postman, apps mobile)
        if (!origin) return callback(null, true);
        // Permite origens na lista
        if (CORS_ORIGINS.includes(origin)) return callback(null, true);
        // Permite qualquer localhost/127.0.0.1 em desenvolvimento
        if (process.env.NODE_ENV === 'development' &&
            (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
            return callback(null, true);
        }
        callback(new Error('CORS não permitido para esta origem'));
    },
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false
    })
);

app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('x-request-id', req.requestId);
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} [${req.requestId}]`);
    next();
});

function ok(res, data, meta = {}) {
    return res.json({ data, meta, error: null });
}

function fail(res, status, code, message, details = null) {
    return res.status(status).json({
        data: null,
        meta: {},
        error: { code, message, details }
    });
}

function normalizeDate(dateValue) {
    if (!dateValue) return null;
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return dateValue;
}

function isPositiveInt(value) {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
}

function onlyDigits(value = '') {
    return value.replace(/\D/g, '');
}

function validateCPF(cpf) {
    const digits = onlyDigits(cpf);
    if (!digits) return true;
    if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;

    const calc = (factor) => {
        let total = 0;
        for (let i = 0; i < factor - 1; i += 1) total += Number(digits[i]) * (factor - i);
        const result = (total * 10) % 11;
        return result === 10 ? 0 : result;
    };

    return calc(10) === Number(digits[9]) && calc(11) === Number(digits[10]);
}

function requireFields(obj, fields) {
    const missing = fields.filter((field) => !obj[field]);
    return { valid: missing.length === 0, missing };
}

function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return fail(res, 401, 'AUTH_REQUIRED', 'Token não informado.');

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (error) {
        return fail(res, 401, 'AUTH_INVALID', 'Token inválido ou expirado.');
    }
}

function roleRequired(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return fail(res, 403, 'FORBIDDEN', 'Usuário sem permissão para esta ação.');
        }
        return next();
    };
}

function sanitizeLike(value = '') {
    return `%${value.replace(/[%_]/g, '')}%`;
}

app.get('/api/health', async (_req, res) => {
    try {
        await db.getAsync('SELECT 1 as ok');
        return ok(res, { status: 'ok', service: 'epi-control-api' });
    } catch (error) {
        return fail(res, 500, 'HEALTH_ERROR', 'Falha no healthcheck.', error.message);
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const check = requireFields(req.body, ['username', 'password']);
        if (!check.valid) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Credenciais incompletas.', check.missing);
        }

        const user = await db.getAsync(
            'SELECT id, username, passwordHash, role, ativo FROM users WHERE username = ?',
            [username]
        );
        if (!user || user.ativo !== 1) {
            return fail(res, 401, 'AUTH_INVALID', 'Usuário ou senha inválidos.');
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return fail(res, 401, 'AUTH_INVALID', 'Usuário ou senha inválidos.');
        }

        const token = jwt.sign(
            { sub: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        await db.logAudit({
            entity: 'auth',
            entityId: user.id,
            action: 'login',
            actorId: user.id,
            actorRole: user.role,
            details: { username: user.username },
            ip: req.ip
        });

        return ok(res, {
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });
    } catch (error) {
        return fail(res, 500, 'LOGIN_ERROR', 'Erro ao autenticar.', error.message);
    }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
    return ok(res, { id: req.user.sub, username: req.user.username, role: req.user.role });
});

app.get('/api/colaboradores', authRequired, async (req, res) => {
    try {
        const search = req.query.search ? sanitizeLike(req.query.search) : null;
        const rows = await db.allAsync(
            `SELECT * FROM colaboradores
             WHERE ativo = 1 AND (? IS NULL OR nome LIKE ? OR funcao LIKE ? OR cidade LIKE ?)
             ORDER BY nome`,
            [search, search, search, search]
        );
        return ok(res, rows, { count: rows.length });
    } catch (error) {
        return fail(res, 500, 'COLABORADORES_LIST_ERROR', 'Erro ao listar colaboradores.', error.message);
    }
});

app.get('/api/colaboradores/:id', authRequired, async (req, res) => {
    try {
        const row = await db.getAsync('SELECT * FROM colaboradores WHERE id = ? AND ativo = 1', [req.params.id]);
        if (!row) return fail(res, 404, 'NOT_FOUND', 'Colaborador não encontrado.');
        return ok(res, row);
    } catch (error) {
        return fail(res, 500, 'COLABORADOR_GET_ERROR', 'Erro ao buscar colaborador.', error.message);
    }
});

app.post('/api/colaboradores', authRequired, roleRequired('admin', 'tecnico'), async (req, res) => {
    try {
        const required = requireFields(req.body, ['id', 'nome', 'funcao', 'dataCadastro']);
        if (!required.valid) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Campos obrigatórios ausentes.', required.missing);
        }

        if (req.body.cpf && !validateCPF(req.body.cpf)) {
            return fail(res, 400, 'VALIDATION_ERROR', 'CPF inválido.');
        }

        await db.runAsync(
            `INSERT INTO colaboradores (
                id, nome, cpf, rg, dataNascimento, funcao, setor, cidade, telefone, email,
                dataUltimoTreinamento, proximoTreinamento, periodicidadeTreinamento,
                dataUltimoExame, proximoExame, periodicidadeExame, dataCadastro, createdBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.body.id,
                req.body.nome,
                req.body.cpf || null,
                req.body.rg || null,
                req.body.dataNascimento || null,
                req.body.funcao,
                req.body.setor || null,
                req.body.cidade || null,
                req.body.telefone || null,
                req.body.email || null,
                req.body.dataUltimoTreinamento || null,
                req.body.proximoTreinamento || null,
                req.body.periodicidadeTreinamento || null,
                req.body.dataUltimoExame || null,
                req.body.proximoExame || null,
                req.body.periodicidadeExame || null,
                req.body.dataCadastro,
                req.user.sub
            ]
        );

        await db.logAudit({
            entity: 'colaborador',
            entityId: req.body.id,
            action: 'create',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: { nome: req.body.nome },
            ip: req.ip
        });

        return res.status(201).json({ data: { id: req.body.id }, meta: {}, error: null });
    } catch (error) {
        return fail(res, 500, 'COLABORADOR_CREATE_ERROR', 'Erro ao criar colaborador.', error.message);
    }
});

app.put('/api/colaboradores/:id', authRequired, roleRequired('admin', 'tecnico'), async (req, res) => {
    try {
        if (req.body.cpf && !validateCPF(req.body.cpf)) {
            return fail(res, 400, 'VALIDATION_ERROR', 'CPF inválido.');
        }

        const result = await db.runAsync(
            `UPDATE colaboradores SET
                nome = ?, cpf = ?, rg = ?, dataNascimento = ?, funcao = ?, setor = ?, cidade = ?,
                telefone = ?, email = ?, dataUltimoTreinamento = ?, proximoTreinamento = ?,
                periodicidadeTreinamento = ?, dataUltimoExame = ?, proximoExame = ?,
                periodicidadeExame = ?, dataAtualizacao = ?, updatedBy = ?
             WHERE id = ? AND ativo = 1`,
            [
                req.body.nome,
                req.body.cpf || null,
                req.body.rg || null,
                req.body.dataNascimento || null,
                req.body.funcao,
                req.body.setor || null,
                req.body.cidade || null,
                req.body.telefone || null,
                req.body.email || null,
                req.body.dataUltimoTreinamento || null,
                req.body.proximoTreinamento || null,
                req.body.periodicidadeTreinamento || null,
                req.body.dataUltimoExame || null,
                req.body.proximoExame || null,
                req.body.periodicidadeExame || null,
                new Date().toISOString(),
                req.user.sub,
                req.params.id
            ]
        );
        if (!result.changes) return fail(res, 404, 'NOT_FOUND', 'Colaborador não encontrado.');

        await db.logAudit({
            entity: 'colaborador',
            entityId: req.params.id,
            action: 'update',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: { nome: req.body.nome },
            ip: req.ip
        });

        return ok(res, { id: req.params.id, updated: true });
    } catch (error) {
        return fail(res, 500, 'COLABORADOR_UPDATE_ERROR', 'Erro ao atualizar colaborador.', error.message);
    }
});

app.delete('/api/colaboradores/:id', authRequired, roleRequired('admin'), async (req, res) => {
    try {
        const result = await db.runAsync('UPDATE colaboradores SET ativo = 0, updatedBy = ? WHERE id = ?', [req.user.sub, req.params.id]);
        if (!result.changes) return fail(res, 404, 'NOT_FOUND', 'Colaborador não encontrado.');

        await db.logAudit({
            entity: 'colaborador',
            entityId: req.params.id,
            action: 'soft-delete',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: null,
            ip: req.ip
        });

        return ok(res, { id: req.params.id, deleted: true });
    } catch (error) {
        return fail(res, 500, 'COLABORADOR_DELETE_ERROR', 'Erro ao remover colaborador.', error.message);
    }
});

app.get('/api/epis', authRequired, async (_req, res) => {
    try {
        const rows = await db.allAsync('SELECT * FROM epis WHERE ativo = 1 ORDER BY nome');
        return ok(res, rows, { count: rows.length });
    } catch (error) {
        return fail(res, 500, 'EPI_LIST_ERROR', 'Erro ao listar EPIs.', error.message);
    }
});

app.get('/api/epis/:id', authRequired, async (req, res) => {
    try {
        const row = await db.getAsync('SELECT * FROM epis WHERE id = ? AND ativo = 1', [req.params.id]);
        if (!row) return fail(res, 404, 'NOT_FOUND', 'EPI não encontrado.');
        return ok(res, row);
    } catch (error) {
        return fail(res, 500, 'EPI_GET_ERROR', 'Erro ao buscar EPI.', error.message);
    }
});

app.post('/api/epis', authRequired, roleRequired('admin', 'tecnico'), async (req, res) => {
    try {
        const required = requireFields(req.body, ['id', 'nome', 'ca', 'tipo', 'validadeCA', 'dataCadastro']);
        if (!required.valid) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Campos obrigatórios ausentes.', required.missing);
        }
        if (!normalizeDate(req.body.validadeCA)) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Validade do CA inválida.');
        }
        if (req.body.estoque < 0 || req.body.estoqueMinimo < 0) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Estoque não pode ser negativo.');
        }

        await db.runAsync(
            `INSERT INTO epis (id, nome, ca, tipo, validadeCA, estoque, estoqueMinimo, descricao, dataCadastro, createdBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.body.id,
                req.body.nome,
                req.body.ca,
                req.body.tipo,
                req.body.validadeCA,
                Number(req.body.estoque || 0),
                Number(req.body.estoqueMinimo || 0),
                req.body.descricao || null,
                req.body.dataCadastro,
                req.user.sub
            ]
        );

        await db.logAudit({
            entity: 'epi',
            entityId: req.body.id,
            action: 'create',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: { nome: req.body.nome, ca: req.body.ca },
            ip: req.ip
        });

        return res.status(201).json({ data: { id: req.body.id }, meta: {}, error: null });
    } catch (error) {
        return fail(res, 500, 'EPI_CREATE_ERROR', 'Erro ao criar EPI.', error.message);
    }
});

app.put('/api/epis/:id', authRequired, roleRequired('admin', 'tecnico'), async (req, res) => {
    try {
        if (req.body.estoque < 0 || req.body.estoqueMinimo < 0) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Estoque não pode ser negativo.');
        }
        const result = await db.runAsync(
            `UPDATE epis SET
                nome = ?, ca = ?, tipo = ?, validadeCA = ?, estoque = ?, estoqueMinimo = ?,
                descricao = ?, dataAtualizacao = ?, updatedBy = ?
             WHERE id = ? AND ativo = 1`,
            [
                req.body.nome,
                req.body.ca,
                req.body.tipo,
                req.body.validadeCA,
                Number(req.body.estoque || 0),
                Number(req.body.estoqueMinimo || 0),
                req.body.descricao || null,
                new Date().toISOString(),
                req.user.sub,
                req.params.id
            ]
        );
        if (!result.changes) return fail(res, 404, 'NOT_FOUND', 'EPI não encontrado.');

        await db.logAudit({
            entity: 'epi',
            entityId: req.params.id,
            action: 'update',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: { nome: req.body.nome, ca: req.body.ca },
            ip: req.ip
        });

        return ok(res, { id: req.params.id, updated: true });
    } catch (error) {
        return fail(res, 500, 'EPI_UPDATE_ERROR', 'Erro ao atualizar EPI.', error.message);
    }
});

app.delete('/api/epis/:id', authRequired, roleRequired('admin'), async (req, res) => {
    try {
        const result = await db.runAsync('UPDATE epis SET ativo = 0, updatedBy = ? WHERE id = ?', [req.user.sub, req.params.id]);
        if (!result.changes) return fail(res, 404, 'NOT_FOUND', 'EPI não encontrado.');

        await db.logAudit({
            entity: 'epi',
            entityId: req.params.id,
            action: 'soft-delete',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: null,
            ip: req.ip
        });

        return ok(res, { id: req.params.id, deleted: true });
    } catch (error) {
        return fail(res, 500, 'EPI_DELETE_ERROR', 'Erro ao remover EPI.', error.message);
    }
});

app.get('/api/entregas', authRequired, async (req, res) => {
    try {
        const from = req.query.from || null;
        const to = req.query.to || null;
        const rows = await db.allAsync(
            `SELECT * FROM entregas
             WHERE (? IS NULL OR dataEntrega >= ?)
               AND (? IS NULL OR dataEntrega <= ?)
             ORDER BY dataEntrega DESC`,
            [from, from, to, to]
        );
        return ok(res, rows, { count: rows.length });
    } catch (error) {
        return fail(res, 500, 'ENTREGA_LIST_ERROR', 'Erro ao listar entregas.', error.message);
    }
});

app.get('/api/entregas/:id', authRequired, async (req, res) => {
    try {
        const row = await db.getAsync('SELECT * FROM entregas WHERE id = ?', [req.params.id]);
        if (!row) return fail(res, 404, 'NOT_FOUND', 'Entrega não encontrada.');
        return ok(res, row);
    } catch (error) {
        return fail(res, 500, 'ENTREGA_GET_ERROR', 'Erro ao buscar entrega.', error.message);
    }
});

app.post('/api/entregas', authRequired, roleRequired('admin', 'tecnico'), async (req, res) => {
    try {
        const required = requireFields(req.body, [
            'id',
            'colaboradorId',
            'epiId',
            'dataEntrega',
            'dataValidade',
            'quantidade',
            'assinaturaDigital',
            'dataCadastro'
        ]);
        if (!required.valid) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Campos obrigatórios ausentes.', required.missing);
        }
        if (!isPositiveInt(req.body.quantidade)) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Quantidade inválida.');
        }
        if (!normalizeDate(req.body.dataEntrega) || !normalizeDate(req.body.dataValidade)) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Datas inválidas.');
        }
        if (req.body.dataValidade < req.body.dataEntrega) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Data de validade não pode ser anterior à entrega.');
        }

        const colaborador = await db.getAsync('SELECT id, nome, ativo FROM colaboradores WHERE id = ?', [req.body.colaboradorId]);
        if (!colaborador || colaborador.ativo !== 1) {
            return fail(res, 400, 'BUSINESS_ERROR', 'Colaborador inexistente ou inativo.');
        }
        const epi = await db.getAsync('SELECT id, nome, ca, estoque, ativo FROM epis WHERE id = ?', [req.body.epiId]);
        if (!epi || epi.ativo !== 1) {
            return fail(res, 400, 'BUSINESS_ERROR', 'EPI inexistente ou inativo.');
        }
        if (epi.estoque < Number(req.body.quantidade)) {
            return fail(res, 400, 'BUSINESS_ERROR', 'Estoque insuficiente para registrar entrega.');
        }

        const assinaturaPayload = {
            confirmacao: req.body.assinaturaDigital === true || req.body.assinaturaDigital === 'true',
            colaboradorId: req.body.colaboradorId,
            epiId: req.body.epiId,
            dataEntrega: req.body.dataEntrega,
            quantidade: Number(req.body.quantidade),
            actorId: req.user.sub
        };
        if (!assinaturaPayload.confirmacao) {
            return fail(res, 400, 'BUSINESS_ERROR', 'Confirmação de assinatura é obrigatória.');
        }
        const assinaturaTimestamp = new Date().toISOString();
        const assinaturaDevice = req.headers['user-agent'] || 'unknown';
        const assinaturaIp = req.ip || 'unknown';
        const assinaturaHash = crypto
            .createHash('sha256')
            .update(JSON.stringify({ ...assinaturaPayload, assinaturaTimestamp, assinaturaDevice, assinaturaIp }))
            .digest('hex');

        await db.execTransaction(async () => {
            await db.runAsync(
                `INSERT INTO entregas (
                    id, colaboradorId, colaboradorNome, epiId, epiNome, epiCA, dataEntrega,
                    dataValidade, quantidade, observacoes, assinaturaHash, assinaturaDevice,
                    assinaturaIp, assinaturaTimestamp, dataCadastro, createdBy
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.body.id,
                    colaborador.id,
                    colaborador.nome,
                    epi.id,
                    epi.nome,
                    epi.ca,
                    req.body.dataEntrega,
                    req.body.dataValidade,
                    Number(req.body.quantidade),
                    req.body.observacoes || null,
                    assinaturaHash,
                    assinaturaDevice,
                    assinaturaIp,
                    assinaturaTimestamp,
                    req.body.dataCadastro,
                    req.user.sub
                ]
            );

            await db.runAsync('UPDATE epis SET estoque = estoque - ? WHERE id = ?', [
                Number(req.body.quantidade),
                epi.id
            ]);
        });

        await db.logAudit({
            entity: 'entrega',
            entityId: req.body.id,
            action: 'create',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: {
                colaboradorId: colaborador.id,
                epiId: epi.id,
                quantidade: Number(req.body.quantidade),
                assinaturaHash
            },
            ip: req.ip
        });

        return res.status(201).json({
            data: { id: req.body.id, assinaturaHash, assinaturaTimestamp },
            meta: {},
            error: null
        });
    } catch (error) {
        return fail(res, 500, 'ENTREGA_CREATE_ERROR', 'Erro ao criar entrega.', error.message);
    }
});

app.delete('/api/entregas/:id', authRequired, roleRequired('admin'), async (req, res) => {
    try {
        const result = await db.runAsync('DELETE FROM entregas WHERE id = ?', [req.params.id]);
        if (!result.changes) return fail(res, 404, 'NOT_FOUND', 'Entrega não encontrada.');

        await db.logAudit({
            entity: 'entrega',
            entityId: req.params.id,
            action: 'delete',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: null,
            ip: req.ip
        });

        return ok(res, { id: req.params.id, deleted: true });
    } catch (error) {
        return fail(res, 500, 'ENTREGA_DELETE_ERROR', 'Erro ao remover entrega.', error.message);
    }
});

app.get('/api/treinamentos', authRequired, async (req, res) => {
    try {
        const colaboradorId = req.query.colaboradorId || null;
        const rows = await db.allAsync(
            `SELECT t.*, c.nome as colaboradorNome, c.funcao, c.cidade
             FROM treinamentos t
             JOIN colaboradores c ON c.id = t.colaboradorId
             WHERE c.ativo = 1 AND (? IS NULL OR t.colaboradorId = ?)
             ORDER BY t.dataTreinamento DESC`,
            [colaboradorId, colaboradorId]
        );
        return ok(res, rows, { count: rows.length });
    } catch (error) {
        return fail(res, 500, 'TREINAMENTO_LIST_ERROR', 'Erro ao listar treinamentos.', error.message);
    }
});

app.post('/api/treinamentos', authRequired, roleRequired('admin', 'tecnico'), async (req, res) => {
    try {
        const required = requireFields(req.body, ['id', 'colaboradorId', 'dataTreinamento', 'dataCadastro']);
        if (!required.valid) return fail(res, 400, 'VALIDATION_ERROR', 'Campos obrigatórios ausentes.', required.missing);
        if (!normalizeDate(req.body.dataTreinamento)) return fail(res, 400, 'VALIDATION_ERROR', 'Data de treinamento inválida.');

        const colaborador = await db.getAsync('SELECT id, ativo FROM colaboradores WHERE id = ?', [req.body.colaboradorId]);
        if (!colaborador || colaborador.ativo !== 1) return fail(res, 400, 'BUSINESS_ERROR', 'Colaborador inexistente ou inativo.');

        await db.execTransaction(async () => {
            await db.runAsync(
                `INSERT INTO treinamentos (id, colaboradorId, dataTreinamento, proximoTreinamento, tipo, observacoes, dataCadastro, createdBy)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.body.id,
                    req.body.colaboradorId,
                    req.body.dataTreinamento,
                    req.body.proximoTreinamento || null,
                    req.body.tipo || null,
                    req.body.observacoes || null,
                    req.body.dataCadastro,
                    req.user.sub
                ]
            );

            await db.runAsync(
                `UPDATE colaboradores
                 SET dataUltimoTreinamento = ?, proximoTreinamento = ?, periodicidadeTreinamento = ?, dataAtualizacao = ?, updatedBy = ?
                 WHERE id = ?`,
                [
                    req.body.dataTreinamento,
                    req.body.proximoTreinamento || null,
                    req.body.periodicidadeTreinamento || null,
                    new Date().toISOString(),
                    req.user.sub,
                    req.body.colaboradorId
                ]
            );
        });

        await db.logAudit({
            entity: 'treinamento',
            entityId: req.body.id,
            action: 'create',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: { colaboradorId: req.body.colaboradorId },
            ip: req.ip
        });

        return res.status(201).json({ data: { id: req.body.id }, meta: {}, error: null });
    } catch (error) {
        return fail(res, 500, 'TREINAMENTO_CREATE_ERROR', 'Erro ao registrar treinamento.', error.message);
    }
});

app.get('/api/exames', authRequired, async (req, res) => {
    try {
        const colaboradorId = req.query.colaboradorId || null;
        const rows = await db.allAsync(
            `SELECT e.*, c.nome as colaboradorNome, c.funcao, c.cidade
             FROM exames e
             JOIN colaboradores c ON c.id = e.colaboradorId
             WHERE c.ativo = 1 AND (? IS NULL OR e.colaboradorId = ?)
             ORDER BY e.dataExame DESC`,
            [colaboradorId, colaboradorId]
        );
        return ok(res, rows, { count: rows.length });
    } catch (error) {
        return fail(res, 500, 'EXAME_LIST_ERROR', 'Erro ao listar exames.', error.message);
    }
});

app.post('/api/exames', authRequired, roleRequired('admin', 'tecnico'), async (req, res) => {
    try {
        const required = requireFields(req.body, ['id', 'colaboradorId', 'dataExame', 'dataCadastro']);
        if (!required.valid) return fail(res, 400, 'VALIDATION_ERROR', 'Campos obrigatórios ausentes.', required.missing);
        if (!normalizeDate(req.body.dataExame)) return fail(res, 400, 'VALIDATION_ERROR', 'Data de exame inválida.');

        const colaborador = await db.getAsync('SELECT id, ativo FROM colaboradores WHERE id = ?', [req.body.colaboradorId]);
        if (!colaborador || colaborador.ativo !== 1) return fail(res, 400, 'BUSINESS_ERROR', 'Colaborador inexistente ou inativo.');

        await db.execTransaction(async () => {
            await db.runAsync(
                `INSERT INTO exames (id, colaboradorId, dataExame, proximoExame, resultado, observacoes, dataCadastro, createdBy)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.body.id,
                    req.body.colaboradorId,
                    req.body.dataExame,
                    req.body.proximoExame || null,
                    req.body.resultado || null,
                    req.body.observacoes || null,
                    req.body.dataCadastro,
                    req.user.sub
                ]
            );

            await db.runAsync(
                `UPDATE colaboradores
                 SET dataUltimoExame = ?, proximoExame = ?, periodicidadeExame = ?, dataAtualizacao = ?, updatedBy = ?
                 WHERE id = ?`,
                [
                    req.body.dataExame,
                    req.body.proximoExame || null,
                    req.body.periodicidadeExame || null,
                    new Date().toISOString(),
                    req.user.sub,
                    req.body.colaboradorId
                ]
            );
        });

        await db.logAudit({
            entity: 'exame',
            entityId: req.body.id,
            action: 'create',
            actorId: req.user.sub,
            actorRole: req.user.role,
            details: { colaboradorId: req.body.colaboradorId, resultado: req.body.resultado || null },
            ip: req.ip
        });

        return res.status(201).json({ data: { id: req.body.id }, meta: {}, error: null });
    } catch (error) {
        return fail(res, 500, 'EXAME_CREATE_ERROR', 'Erro ao registrar exame.', error.message);
    }
});

app.get('/api/dashboard/stats', authRequired, async (_req, res) => {
    try {
        const totalColaboradores = await db.getAsync('SELECT COUNT(*) as total FROM colaboradores WHERE ativo = 1');
        const totalEpis = await db.getAsync('SELECT COUNT(*) as total FROM epis WHERE ativo = 1');
        const totalEntregas = await db.getAsync('SELECT COUNT(*) as total FROM entregas');
        return ok(res, {
            totalColaboradores: totalColaboradores.total,
            totalEpis: totalEpis.total,
            totalEntregas: totalEntregas.total
        });
    } catch (error) {
        return fail(res, 500, 'DASHBOARD_ERROR', 'Erro ao obter estatísticas.', error.message);
    }
});

app.get('/api/relatorios/vencimentos', authRequired, async (_req, res) => {
    try {
        const rows = await db.allAsync(
            `SELECT colaboradorNome, epiNome, epiCA, dataValidade, quantidade
             FROM entregas
             ORDER BY dataValidade ASC`
        );
        return ok(res, rows, { count: rows.length });
    } catch (error) {
        return fail(res, 500, 'RELATORIO_VENCIMENTOS_ERROR', 'Erro no relatório de vencimentos.', error.message);
    }
});

app.get('/api/relatorios/por-setor', authRequired, async (_req, res) => {
    try {
        const rows = await db.allAsync(
            `SELECT COALESCE(c.setor, 'Não informado') as setor, COUNT(e.id) as totalEntregas
             FROM colaboradores c
             LEFT JOIN entregas e ON e.colaboradorId = c.id
             WHERE c.ativo = 1
             GROUP BY COALESCE(c.setor, 'Não informado')
             ORDER BY totalEntregas DESC`
        );
        return ok(res, rows, { count: rows.length });
    } catch (error) {
        return fail(res, 500, 'RELATORIO_SETOR_ERROR', 'Erro no relatório por setor.', error.message);
    }
});

app.get('/api/relatorios/conformidade', authRequired, async (_req, res) => {
    try {
        const totalColaboradores = await db.getAsync('SELECT COUNT(*) as total FROM colaboradores WHERE ativo = 1');
        const pendentesTreinamento = await db.getAsync(
            `SELECT COUNT(*) as total
             FROM colaboradores
             WHERE ativo = 1 AND proximoTreinamento IS NOT NULL AND proximoTreinamento < date('now')`
        );
        const pendentesExame = await db.getAsync(
            `SELECT COUNT(*) as total
             FROM colaboradores
             WHERE ativo = 1 AND proximoExame IS NOT NULL AND proximoExame < date('now')`
        );

        return ok(res, {
            totalColaboradores: totalColaboradores.total,
            pendentesTreinamento: pendentesTreinamento.total,
            pendentesExame: pendentesExame.total
        });
    } catch (error) {
        return fail(res, 500, 'RELATORIO_CONFORMIDADE_ERROR', 'Erro no relatório de conformidade.', error.message);
    }
});

app.get('/api/audit-logs', authRequired, roleRequired('admin'), async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 50), 500);
        const rows = await db.allAsync(
            `SELECT id, entity, entityId, action, actorId, actorRole, details, ip, createdAt
             FROM audit_logs
             ORDER BY id DESC
             LIMIT ?`,
            [limit]
        );
        return ok(res, rows, { count: rows.length });
    } catch (error) {
        return fail(res, 500, 'AUDIT_LIST_ERROR', 'Erro ao listar auditoria.', error.message);
    }
});

app.get('/', (_req, res) => {
    return ok(res, {
        message: 'API Sistema de Controle de EPIs',
        version: '2.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth/login',
            colaboradores: '/api/colaboradores',
            epis: '/api/epis',
            entregas: '/api/entregas',
            treinamentos: '/api/treinamentos',
            exames: '/api/exames',
            relatorios: '/api/relatorios/*'
        }
    });
});

app.use((err, _req, res, _next) => {
    console.error(err.stack);
    return fail(res, 500, 'INTERNAL_ERROR', 'Erro interno do servidor.');
});

app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
});

module.exports = app;
