# MongoDB Sync Service

Serviço de sincronização automática MySQL → MongoDB.

## 🎯 Objetivo

Este serviço monitora continuamente o banco MySQL e replica os dados para o MongoDB, mantendo ambos sincronizados.

## 🏗️ Arquitetura

```
MySQL (appdb) → Polling Service → MongoDB (querydb)
     ↓                                    ↓
  persons table                    persons collection
```

## 🚀 Como Usar

### Com Docker Compose

```bash
# Iniciar todos os serviços (incluindo mongo-sync)
docker-compose up -d

# Ver logs do serviço de sincronização
docker logs -f mongo-sync

# Parar o serviço
docker-compose stop mongo-sync
```

### Desenvolvimento Local

```bash
cd back/mongo-sync

# Instalar dependências
npm install

# Configurar variáveis de ambiente (criar .env)
MONGODB_URL=mongodb://admin:admin123@localhost:27017/querydb?authSource=admin
MYSQL_URL=mysql://appuser:app123@localhost:3306/appdb
MYSQL_SYNC_INTERVAL_MS=5000
PORT=3001

# Executar em modo dev
npm run start:dev
```

## 📡 Endpoints da API

### GET /sync/stats
Retorna estatísticas de sincronização:

```json
{
  "mysqlCount": 10,
  "mongoCount": 10,
  "lastSync": "2025-12-28T10:30:00.000Z",
  "pollInterval": 5000,
  "inSync": true
}
```

**Exemplo:**
```bash
curl http://localhost:3001/sync/stats
```

### POST /sync/force
Força uma sincronização manual completa:

```json
{
  "synced": 10
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3001/sync/force
```

## ⚙️ Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `MONGODB_URL` | `mongodb://admin:admin123@mongodb-query:27017/querydb?authSource=admin` | URL de conexão do MongoDB |
| `MYSQL_URL` | `mysql://appuser:app123@mysql-app:3306/appdb` | URL de conexão do MySQL |
| `MYSQL_SYNC_INTERVAL_MS` | `5000` | Intervalo de polling em milissegundos |
| `PORT` | `3001` | Porta da API REST |

## 🔄 Como Funciona

1. **Inicialização**: Ao iniciar, faz uma carga completa do MySQL para o MongoDB
2. **Polling Contínuo**: A cada 5 segundos (configurável), busca registros atualizados
3. **Sincronização Incremental**: Usa o campo `updatedAt` para identificar mudanças
4. **Upsert**: Atualiza ou insere registros no MongoDB (idempotente)

## 📊 Estrutura dos Dados

### MySQL (Origem)
```sql
CREATE TABLE persons (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  createdAt DATETIME,
  updatedAt DATETIME
);
```

### MongoDB (Destino)
```javascript
{
  id: "uuid-string",
  name: "John Doe",
  email: "john@example.com",
  createdAt: ISODate("2025-12-28T10:00:00Z"),
  updatedAt: ISODate("2025-12-28T10:30:00Z")
}
```

## 🐳 Container Docker

- **Nome**: `mongo-sync`
- **Porta**: `3001`
- **Rede**: `keycloak-network`
- **Dependências**: `mysql`, `mongodb`

## 📝 Logs

O serviço gera logs detalhados:
- ✅ Sincronizações bem-sucedidas
- 🔄 Polling em andamento
- ⚠️ Avisos (conexão, retries)
- ❌ Erros (com stack trace)

## 🎯 Casos de Uso

- **CQRS**: Separação de write (MySQL) e read (MongoDB)
- **Migração Gradual**: Transição de MySQL para MongoDB
- **Read Replicas**: MongoDB como réplica de leitura
- **Analytics**: Dados no MongoDB para agregações complexas

## 🔧 Troubleshooting

### Serviço não inicia
```bash
# Verificar logs
docker logs mongo-sync

# Verificar se MySQL e MongoDB estão rodando
docker ps | grep -E "mysql|mongo"
```

### Dados não sincronizam
```bash
# Forçar sincronização manual
curl -X POST http://localhost:3001/sync/force

# Verificar estatísticas
curl http://localhost:3001/sync/stats
```

### Erro de conexão MySQL/MongoDB
- Verificar se os containers estão na mesma rede
- Confirmar credenciais nas variáveis de ambiente
- Aguardar healthchecks dos serviços dependentes

## 📦 Dependências Principais

- `@nestjs/mongoose` - Integração MongoDB
- `mongoose` - ODM para MongoDB
- `mysql2` - Cliente MySQL com suporte a promises
- `@nestjs/config` - Gerenciamento de configuração

## 🚦 Status

✅ **Pronto para produção** (com considerações):
- Implementar dead letter queue para falhas
- Adicionar métricas (Prometheus)
- Configurar alertas
- Implementar backoff exponencial em erros
