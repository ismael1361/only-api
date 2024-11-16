# only-api

O `only-api` é um pacote projetado para facilitar a criação de rotas de maneira flexível e dinâmica, eliminando a necessidade de configurações excessivas e complexas para desenvolver uma estrutura de API REST.

A motivação para o desenvolvimento deste pacote surgiu da observação das dificuldades enfrentadas ao otimizar as endpoints de uma API REST. Tradicionalmente, ao adicionar uma nova rota, é necessário atualizar o arquivo de rotas correspondente, o que pode tornar o desenvolvimento mais lento e complexo. Este processo pode ser especialmente desafiador em arquivos de rotas extensos com muitas configurações, mesmo ao utilizar frameworks populares como o `express`. Além disso, foi identificado que a transição entre rotas dentro da mesma arquitetura pode ser complicada, aumentando a complexidade do desenvolvimento de uma API REST.

O `only-api` aborda essas questões ao fornecer uma solução que simplifica o gerenciamento de rotas, permitindo que os desenvolvedores criem e modifiquem endpoints de maneira mais eficiente e intuitiva, sem comprometer a flexibilidade e a dinamismo do sistema.

Para isso, o `only-api` utiliza um sistema de herança baseado em uma estrutura de diretórios específica, onde cada subdiretório representa uma rota de API REST. Essa abordagem permite que as rotas sejam definidas e organizadas de maneira intuitiva e modular, refletindo diretamente a estrutura de pastas do projeto. Por exemplo:

```
routes
    ├── users
    │   ├── index.js
    │   ├── $id
    │   │   ├── index.ts
    └── posts
        ├── index.js
        └── [id]
            └── index.ts
```

Neste exemplo, o diretório `users` contém um arquivo `index.js` que define a rota principal `/users`, enquanto o diretório `$id` contém um arquivo `index.ts` que define a rota `/users/:id`, o diretório `posts` contém um arquivo `index.js` que define a rota principal `/posts`, e o diretório `[id]` contém um arquivo `index.ts` que define a rota `/posts[id]`. Dessa forma, as rotas são organizadas de acordo com a estrutura de pastas, facilitando a navegação e a manutenção do código. Ou seja:

```
routes/users
routes/users/$id
routes/posts
routes/posts[id]
```

Além disso, o `only-api` elimina a necessidade de pacotes adicionais, como o `nodemon`, que são comumente usados para monitorar mudanças em arquivos e reiniciar o projeto automaticamente. O `only-api` incorpora mecanismos internos que gerenciam essas mudanças de forma eficiente, proporcionando um ambiente de desenvolvimento mais ágil e menos propenso a erros.

Essa metodologia não apenas simplifica a criação e a manutenção das rotas, mas também melhora a eficiência do desenvolvimento ao reduzir a complexidade das configurações e minimizar a sobrecarga associada ao gerenciamento manual de arquivos de rota e à reinicialização do servidor.

O `only-api` também oferece funcionalidades úteis para uso em rotas, como a capacidade de definir middlewares personalizados, validar parâmetros de entrada e saída, e personalizar o comportamento de cada rota de forma flexível e dinâmica. Esses recursos permitem que os desenvolvedores personalizem as rotas de acordo com as necessidades específicas de seus projetos, sem comprometer a simplicidade e a eficiência do sistema.

**Índice**

- [only-api](#only-api)
  - [Instalação](#instalação)
  - [Uso](#uso)
    - [`Método HTTP` - Métodos de Rota](#método-http---métodos-de-rota)
      - [`GET` - Recuperar Dados](#get---recuperar-dados)
      - [`POST` - Enviar Dados](#post---enviar-dados)
      - [`PUT` - Atualizar Dados](#put---atualizar-dados)
      - [`DELETE` - Excluir Dados](#delete---excluir-dados)
      - [`ALL` - Aceitar Qualquer Método HTTP](#all---aceitar-qualquer-método-http)
      - [`middleware` - Middleware Global](#middleware---middleware-global)
      - [`default` - Método `ALL`](#default---método-all)
    - [`RouteResponse` - Resposta da Rota](#routeresponse---resposta-da-rota)
      - [`Content-Type` - Tipos de Conteúdo](#content-type---tipos-de-conteúdo)
      - [`ReadableStream` - Fluxo de Leitura](#readablestream---fluxo-de-leitura)
    - [`RouteRequest` - Requisição da Rota](#routerequest---requisição-da-rota)
    - [`curinga` - Parâmetros de Rota Dinâmicos](#curinga---parâmetros-de-rota-dinâmicos)
      - [`$` - Curinga de Definição de Parâmetros](#---curinga-de-definição-de-parâmetros)
      - [`[]` - Curinga de Definição de Parâmetros de Lista](#---curinga-de-definição-de-parâmetros-de-lista)
    - [`Middlewares` - Middlewares Personalizados](#middlewares---middlewares-personalizados)
  - [Funções Especiais](#funções-especiais)
    - [`corsOringin` - Configuração do CORS](#corsoringin---configuração-do-cors)
    - [`requiresAccess` - Middleware de Autenticação modo www-authenticate (Basic Auth)](#requiresaccess---middleware-de-autenticação-modo-www-authenticate-basic-auth)
    - [`getUrlOrigin` - Obter a Origem da URL](#geturlorigin---obter-a-origem-da-url)
    - [`cacheControl` - Armazenamento da Rota em Cache](#cachecontrol---armazenamento-da-rota-em-cache)
    - [`getCached` - Obter Resposta Armazenada em Cache](#getcached---obter-resposta-armazenada-em-cache)
    - [`setCache` - Armazenar Valor em Cache](#setcache---armazenar-valor-em-cache)

## Instalação

Para instalar o `only-api`, basta executar o seguinte comando:

```bash
npm install only-api
```

ou

```bash
yarn add only-api
```

## Uso

Para utilizar o `only-api`, basta importar o pacote para o seu projeto e inicializá-lo com as configurações desejadas. Por exemplo:

```ts
import onlyApi from 'only-api';

const app = onlyApi("./routes", {
    port: 3000,
    host: "localhost",
    middlewares: [
        (req, res, next) => {
            console.log("Middleware executado!");
            next();
        }
    ]
});
```

O `onlyApi` requer dois parâmetros: o caminho para o diretório de rotas e um objeto de configuração opcional. O diretório de rotas deve seguir a estrutura de pastas mencionada anteriormente, onde cada subdiretório representa uma rota de API REST. O objeto de configuração pode conter as seguintes propriedades:

- `port` [*number*]: a porta na qual o servidor será iniciado (padrão: `3000`)
- `host` [*string*]: o host no qual o servidor será iniciado (padrão: `localhost`)
- `middlewares` [*Function[]*]: uma lista de middlewares personalizados a serem executados antes de cada rota (padrão: `[]`)
- `maxPayloadSize` [*string*]: o tamanho máximo do payload aceito pelo servidor (padrão: `1048576`)
- `allowOrigin` [*boolean | string | RegExp | Array<boolean | string | RegExp>*]: o domínio permitido para acessar o servidor (padrão: `*`)
- `cors` [*CorsOptions*]: as opções de CORS a serem aplicadas ao servidor (padrão: `{}`)
- `trustProxy` [*boolean*]: se o servidor deve confiar no cabeçalho `X-Forwarded-For` (padrão: `false`)

Após a inicialização do `only-api`, o servidor será iniciado automaticamente e as rotas serão carregadas dinamicamente com base na estrutura de pastas fornecida. Qualquer alteração nos arquivos de rota será detectada automaticamente e refletida no servidor sem a necessidade de reinicialização manual.

Cada arquivo de rota deve exportar uma série de funções que definem o comportamento da rota, de acordo com a necessidade. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = (req) => {
    return RouteResponse.text("GET /users");
};

export const post = (req) => {
    return RouteResponse.text("POST /users");
};

export const put = (req) => {
    return RouteResponse.text("PUT /users");
};

export const delete = (req) => {
    return RouteResponse.text("DELETE /users");
};
```

### `Método HTTP` - Métodos de Rota

No exemplo anterior, observe que cada função exportada deve corresponder a um método HTTP específico (por exemplo, `get`, `post`, `put`, `delete`, `all`) e retornar um objeto `RouteResponse` que define a resposta da rota. Se caso definir uma função ou um array de funções como `default`, será tratado como método `all`.

Por padrão, o `only-api` suporta os seguintes métodos HTTP:

- `get` [*Function|Function[]*]: o método `GET` é usado para recuperar dados de um servidor
- `post` [*Function|Function[]*]: o método `POST` é usado para enviar dados para um servidor
- `put` [*Function|Function[]*]: o método `PUT` é usado para atualizar dados em um servidor
- `delete` [*Function|Function[]*]: o método `DELETE` é usado para excluir dados de um servidor
- `all` [*Function|Function[]*]: o método `ALL` é usado para aceitar qualquer método HTTP
- `middleware` [*Function[]*]: exportar uma função ou um array de funções como `middleware` será tratado como middleware global da rota específica, ou seja, será válido para todos os métodos da rota e será executado antes de todos os métodos da rota
- `default` [*Function|Function[]*]: exportar uma função ou um array de funções como `default` será tratado como método `ALL`

#### `GET` - Recuperar Dados

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = (req) => {
    return RouteResponse.text("GET /users");
};
```

Exemplo com `middleware`:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = [(req) => {
    console.log("Middleware executado!");
    return true;
}, (req) => {
    return RouteResponse.json({ message: "GET /users" });
}];
```

#### `POST` - Enviar Dados

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const post = (req) => {
    return RouteResponse.text("POST /users");
};
```

Exemplo com `middleware`:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const post = [(req) => {
    console.log("Middleware executado!");
    return true;
}, (req) => {
    return RouteResponse.json({ message: "POST /users" });
}];
```

#### `PUT` - Atualizar Dados

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const put = (req) => {
    return RouteResponse.text("PUT /users");
};
```

Exemplo com `middleware`:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const put = [(req) => {
    console.log("Middleware executado!");
    return true;
}, (req) => {
    return RouteResponse.json({ message: "PUT /users" });
}];
```

#### `DELETE` - Excluir Dados

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const delete = (req) => {
    return RouteResponse.text("DELETE /users");
};
```

Exemplo com `middleware`:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const delete = [(req) => {
    console.log("Middleware executado!");
    return true;
}, (req) => {
    return RouteResponse.json({ message: "DELETE /users" });
}];
```

#### `ALL` - Aceitar Qualquer Método HTTP

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const default = (req) => {
    return RouteResponse.text("ALL /users");
};
```

Exemplo com `middleware`:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const default = [(req) => {
    console.log("Middleware executado!");
    return true;
}, (req) => {
    return RouteResponse.json({ message: "ALL /users" });
}];
```

#### `middleware` - Middleware Global

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const middleware = (req) => {
    console.log("Middleware executado!");
    return true;
};

export const get = (req) => {
    return RouteResponse.text("GET /users");
};
```

Por exemplo middleware global com erro:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const middleware = (req) => {
    console.log("Middleware executado com erro!");
    return new Error("Erro");
};

export const get = (req) => {
    return RouteResponse.text("GET /users");
};
```

Por exemplo middleware global com `next`:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const middleware = (req, next) => {
    console.log("Middleware executado com sucesso!");
    next();
};

export const get = (req) => {
    return RouteResponse.text("GET /users");
};
```

Por exemplo middleware global com `next` e erro:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const middleware = (req, next) => {
    console.log("Middleware executado com erro!");
    next(new Error("Erro"));
};

export const get = (req) => {
    return RouteResponse.text("GET /users");
};
```

#### `default` - Método `ALL`

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export default (req) => {
    return RouteResponse.text("ALL /users");
};
```

Por exemplo com `middleware`:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export default [(req) => {
    console.log("Middleware executado!");
    return true;
}, (req) => {
    return RouteResponse.json({ message: "ALL /users" });
}];
```

### `RouteResponse` - Resposta da Rota

é obrigatório que as rotas retorne uma resposta utilizando o objeto `RouteResponse` para definir o comportamento da rota. O objeto `RouteResponse` é responsável por gerar a resposta da rota com base nos dados fornecidos. Ele fornece métodos estáticos para retornar respostas de texto, JSON, HTML, buffer, stream, erro e personalizadas, bem como definir o código de status da resposta. Se caso uma rota retornar um valor qualquer, será tratado como erro e resultará em uma resposta de erro com o código de status `500` e a mensagem de erro correspondente. O objeto `RouteResponse` possui os seguintes métodos estáticos disponíveis:

- `json` [*RouteResponse*]: retorna uma resposta JSON com o corpo fornecido
- `text` [*RouteResponse*]: retorna uma resposta de texto com o corpo fornecido
- `html` [*RouteResponse*]: retorna uma resposta HTML com o corpo fornecido
- `buffer` [*RouteResponse*]: retorna uma resposta de buffer com o corpo fornecido
- `stream` [*RouteResponse*]: retorna uma resposta de stream com o corpo fornecido
- `send` [*RouteResponse*]: envia uma resposta com o corpo fornecido e os cabeçalhos fornecidos
- `error` [*RouteResponse*]: retorna uma resposta de erro com o código de status fornecido e a mensagem de erro fornecida
- `status` [*RouteResponse*]: define o código de status da resposta

Exemplos:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = (req) => {
    return RouteResponse.json({ message: "GET /users" });
    // return RouteResponse.send({ message: "GET /users" });
    // return RouteResponse.send({ message: "GET /users" }, "application/json");
    // return RouteResponse.error(404, "Not Found");
    // return RouteResponse.status(200).json({ message: "GET /users" });
    // return RouteResponse.status(200, "Ok").json({ message: "GET /users" });
};

export const post = (req) => {
    return RouteResponse.text("POST /users");
    // return RouteResponse.text("POST /users", "text/plain");
};

export const put = (req) => {
    return RouteResponse.html("<h1>PUT /users</h1>");
    // return RouteResponse.stream(fs.createReadStream("file.txt"));
    // return RouteResponse.stream(fs.createReadStream("file.txt"), "application/octet-stream");
    // return RouteResponse.stream((start, end) => chunk.slice(start, end));
};

export const delete = (req) => {
    return RouteResponse.buffer(Buffer.from("DELETE /users"));
    // return RouteResponse.buffer(Buffer.from("DELETE /users"), "application/octet-stream");
};
```

O único retorno aceitável é um objeto `RouteResponse` ou uma `Promise` que resolve em um objeto `RouteResponse`. Qualquer outro tipo de retorno será tratado como um erro e resultará em uma resposta de erro com o código de status `500` e a mensagem de erro correspondente ou uma resposta da propriedade `send` em `RouteResponse` que seja capaz de resolver o retorno.

#### `Content-Type` - Tipos de Conteúdo

Em algumas propriedades no `RouteResponse`, é possível passar um segundo parâmetro opcional que define o tipo de conteúdo da resposta. Por exemplo, `RouteResponse.text("GET /users", "text/plain")` define o tipo de conteúdo da resposta como `text/plain`. Ele pode ser uma string ou um objeto que define o tipo de conteúdo da resposta. Exemplos:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = (req) => {
    return RouteResponse.send("GET /users", "text/plain");
};

export const post = (req) => {
    return RouteResponse.send("POST /users", {
        type: "text/plain",
        length: 10, 
        attachment: true
    });
};

export const put = (req) => {
    return RouteResponse.send("<h1>PUT /users</h1>", { 
        type: "text/plain", 
        attachment: "file.txt", 
        security: "no-referrer"
    });
};

export const delete = (req) => {
    return RouteResponse.send(Buffer.from("DELETE /users"), {
        type: "text/plain", 
        disposition: "attachment; filename=\"file.txt\"", 
        security: { 
            policy: "no-referrer", 
            reportOnly: true
        }
    });
};
```

#### `ReadableStream` - Fluxo de Leitura

O `RouteResponse` possui um método estático `stream` que permite retornar uma resposta de stream com o corpo fornecido. O corpo fornecido pode ser um fluxo de leitura, uma função de leitura ou um buffer. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = (req) => {
    return RouteResponse.stream(fs.createReadStream("file.txt"));
};

export const post = (req) => {
    return RouteResponse.stream((start, end) => chunk.slice(start, end));
};

export const put = (req) => {
    return RouteResponse.stream(Buffer.from("PUT /users"));
};

export const delete = (req) => {
    return RouteResponse.stream(fs.createReadStream("file.txt"), "application/octet-stream");
};
```

### `RouteRequest` - Requisição da Rota

O Request passado para cada função é bastante limitado, isso pensando em segurança e simplicidade. Para acessar os dados do Request, basta acessar o primeiro parâmetro da função. Para acessar os dados do Response, basta retornar um objeto `RouteResponse`, como mostrado anteriormente. A estrutura do Request é a seguinte:

```ts
interface RouteRequest<
    B extends Object = Record<string, any>,
    P extends string = string,
    Q extends string = string,
    C extends Record<string, any> = {
        [key: string]: any;
    },
> {
    method: "GET" | "POST" | "PUT" | "DELETE";
    headers: Headers;
    body: B;
    params: {
        [key in P]: string;
    };
    query: Partial<{
        [key in Q]: string;
    }>;
    cache: SimpleCache<C>;
    files: FileInfo[];
    file?: FileInfo;
}
```

- `method` [*string*]: o método HTTP da requisição
- `headers` [*Headers*]: os cabeçalhos da requisição
- `body` [*B*]: o corpo da requisição
- `params` [*Record<string, string>*]: os parâmetros da rota
- `query` [*Record<string, string>*]: os parâmetros da query
- `cache` [*SimpleCache<C>*]: um cache simples para armazenar dados temporários na rota atual, desrrespeitando os curingas

Exemplo:

```ts
// routes/users/$id/index.ts
import { RouteRequest, RouteResponse } from 'only-api';

export const get = (req: RouteRequest<{}, "id", "date"|"q">) => {
    const { id } = req.params;
    const { date, q } = req.query;
    return RouteResponse.json({ message: `GET /users/${id}` });
};
```

### `curinga` - Parâmetros de Rota Dinâmicos

O `only-api` suporta parâmetros de rota dinâmicos, que podem ser definidos entre colchetes `[]` no diretório de rota. Por exemplo, o diretório `[id]` define um parâmetro de rota dinâmico chamado `id`. O valor do parâmetro de rota dinâmico é acessível através do objeto `params` do Request. Por exemplo:

```ts
// routes/users/[id]/index.ts -> routes/users[id]
import { RouteRequest, RouteResponse } from 'only-api';

export const get = (req: RouteRequest) => {
    const { id } = req.params;
    return RouteResponse.json({ message: `GET /users/${id}` });
};
```

#### `$` - Curinga de Definição de Parâmetros

O curinga `$` é um curinga especial que permite definir parâmetros de rota dinâmicos com base no nome do diretório. Por exemplo, o diretório `$id` define um parâmetro de rota dinâmico chamado `id`. Por exemplo:

```ts
// routes/users/$id/index.ts -> routes/users/$id
import { RouteRequest, RouteResponse } from 'only-api';

export const get = (req: RouteRequest) => {
    const { id } = req.params;
    return RouteResponse.json({ message: `GET /users/${id}` });
};
```

* Realizando uma requisição `GET /users/123` para a rota definida como `routes/users/$id`:
  * O valor de `id` será `123`.
* Realizando uma requisição `GET /users/123/post/456` para a rota definida como `routes/users/$user/post/$id`:
  * O valor de `user` será `123`.
  * O valor de `id` será `456`.

#### `[]` - Curinga de Definição de Parâmetros de Lista

O curinga `[]` é um curinga especial que permite definir index de listagem, como por exemplo, `users[0]`, `users[1]`, `users[2]`, etc. Por exemplo:

```ts
// routes/users/[index]/index.ts -> routes/users[0]

import { RouteRequest, RouteResponse } from 'only-api';

export const get = (req: RouteRequest) => {
    const { index } = req.params;
    return RouteResponse.json({ message: `GET /users/${0}` });
};
```

> **Nota**: O curinga `[]`, por servir como index de listagem, só possível usa-lo para números inteiros. Ou seja, `users[0]`, `users[1]`, `users[2]`, etc. Não é possível usar `users[0.1]`, `users["nome"]`, `users[true]`, etc.

* Realizando uma requisição `GET /users[0]` para a rota definida como `routes/users[index]`:
  * O valor de `index` será `0`.
* Realizando uma requisição `GET /users[0]` para a rota definida como `routes/users[]`:
  * O valor de `0` será `0`.
* Realizando uma requisição `GET /users/123/post[456]` para a rota definida como `routes/users/$user/post[id]`:
  * O valor de `user` será `123`.
  * O valor de `id` será `456`.
* Realizando uma requisição `GET /users/123/post[456]` para a rota definida como `routes/users/$user/post[]`:
  * O valor de `user` será `123`.
  * O valor de `1` será `456`.
* Realizando uma requisição `GET /users[123]/post[456]` para a rota definida como `routes/users[user]/post[id]`:
  * O valor de `user` será `123`.
  * O valor de `id` será `456`.
* Realizando uma requisição `GET /users[123]/post[456]` para a rota definida como `routes/users[]/post[]`:
  * O valor de `0` será `123`.
  * O valor de `1` será `456`.

### `Middlewares` - Middlewares Personalizados

Os middlewares são funções que são executadas antes de cada rota. Eles podem ser usados para adicionar funcionalidades adicionais às rotas, como autenticação, validação de parâmetros, tratamento de erros, entre outros. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse } from 'only-api';

export const get = [(req)=>{
    console.log("Middleware executado!");
    return true;
}, (req) => {
    return RouteResponse.json({ message: "GET /users" });
}];
```

É possível exportar uma função ou lista de funções chamada `middleware` que será executada antes de todas os metodos da rota:

```ts
// routes/users/$id/index.ts
import { RouteResponse } from 'only-api';

export const middleware = [(req) => {
    console.log("Middleware executado com sucesso!");
    return true;
}, (req) => {
    console.log("Middleware 2 executado com falha!");
    return false;
}, (req) => {
    console.log("Middleware 3 executado com falha!");
    return new Error("Erro");
}, (req, next)=>{
    console.log("Middleware 4 executado com sucesso!");
    next();
}, (req, next)=>{
    console.log("Middleware 5 executado com falha!");
    next(false);
}, (req, next)=>{
    console.log("Middleware 6 executado com falha!");
    next(new Error("Erro"));
}];

export const get = (req) => {
    return RouteResponse.json({ message: "GET /users" });
};
```

Os middlewares podem ser definidos como funções individuais ou como uma lista de funções. Eles podem retornar um valor booleano ou uma `Promise` que resolve em um valor booleano. Se um middleware retornar `false`, a rota atual não será executada e a resposta será enviada diretamente ao cliente. Se um middleware retornar `true`, a rota atual será executada normalmente. Se um middleware retornar uma `Promise` que rejeita, a resposta será enviada com o código de status `500` e a mensagem de erro correspondente.

Observe que a lógica dos middlewares, como demonstrados nos exemplos anteriores, são bastante limitados. Isso foi feito pensando em segurança e simplicidade. Para lógicas mais complexas, para utilizar diretamento no Express, por exemplo, é possível definir os middlewares no objeto de configuração do `only-api`, que pode ser uma função ou uma array de funções. Por exemplo:

```ts
import onlyApi from 'only-api';

const app = onlyApi("./routes", {
    port: 3000,
    host: "localhost",
    middlewares: [
        (req, res, next) => {
            console.log("Middleware executado!");
            next();
        }
    ]
});
```

> **Nota**: É importante notar que, ao definir middlewares no objeto de configuração, eles serão executados antes de quaisquer rotas, independentemente do método HTTP. Isso pode ser útil para adicionar funcionalidades globais ao servidor, como autenticação, validação de parâmetros, tratamento de erros, entre outros. Utilize com cuidado.

## Funções Especiais

O `only-api` oferece algumas funções especiais que podem ser utilizadas para personalizar o comportamento das rotas de forma flexível e dinâmica. Essas funções podem ser exportadas em qualquer arquivo de rota (somente nas rotas) e deverão ser chamadas entro da função de rota desejada. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, corsOringin } from 'only-api';

export const get = (req) => {
    corsOringin("http://example.com");

    return RouteResponse.json({ message: "GET /users" });
};
```

As funções especiais disponíveis são:

### `corsOringin` - Configuração do CORS

A função `corsOringin` permite definir o domínio permitido para acessar a rota atual. Ele responde um `throws` caso o domínio não seja permitido. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, corsOringin } from 'only-api';

export const get = async (req) => {
    await corsOringin("http://example.com");

    return RouteResponse.json({ message: "GET /users" });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Configura o cabeçalho CORS e ao mesmo tempo valida a origem
 * @param origin Origem permitida
 * @param exposeHeaders Cabeçalhos expostos
 * @throws Se a origem não for permitida
 */
const corsOringin: (origin: string | string[], exposeHeaders?: string | string[]) => void;
```

### `requiresAccess` - Middleware de Autenticação modo www-authenticate (Basic Auth)

A função `requiresAccess` permite definir um middleware de autenticação `www-authenticate (Basic Auth)` para a rota atual. Ele responde um `throws` caso o usuário não esteja autenticado. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, requiresAccess } from 'only-api';

export const get = async (req) => {
    await requiresAccess({ admin: "12345" });

    return RouteResponse.json({ message: "GET /users" });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Requer acesso para acessar uma rota
 * @param users Usuários e senhas permitidos
 * @throws Se o usuário não tiver acesso
 */
const requiresAccess: (users: Record<string, string | string[]>) => void
```

### `getUrlOrigin` - Obter a Origem da URL

A função `getUrlOrigin` permite obter a origem da URL atual, respeitando o curinga. Por exemplo:

```ts
// routes/users/$id/index.ts
import { RouteResponse, getUrlOrigin } from 'only-api';

export const get = (req) => {
    const origin = getUrlOrigin(); // routes/users/admin

    return RouteResponse.json({ origin });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Obter a origem da URL
 * @returns A origem da URL
 */
const getUrlOrigin: () => string;
```

### `cacheControl` - Armazenamento da Rota em Cache

A função `cacheControl` permite personalizar o armazenamento em cache da resposta da rota atual. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, cacheControl } from 'only-api';

export const get = (req) => {
    cacheControl(15);

    return RouteResponse.json({ message: "GET /users" });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Armazenar em cache a resposta de uma rota
 * @param duration A duração do cache em segundos
 * @param id Um identificador único para a rota
 * @throws Se a rota já estiver armazenada em cache; expressão regular "__cache_control_response__{id}"
 */
const cacheControl: (duration: number, id?: string) => void;
```

### `getCached` - Obter Resposta Armazenada em Cache

A função `getCached` permite obter a resposta armazenada em cache da rota atual. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, getCached } from 'only-api';

export const get = (req) => {
    const cached = getCached();

    if (cached) return RouteResponse.json(cached);

    return RouteResponse.json({ message: "GET /users" });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Obter a resposta armazenada em cache
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
const getCached: <T = any>(id?: string) => T | undefined;
```

### `setCache` - Armazenar Valor em Cache

A função `setCache` permite armazenar, de forma personalizada, um valor em cache. Por exemplo:

```ts
// routes/users/index.ts
import { RouteResponse, setCache, getCached } from 'only-api';

export const get = (req) => {
    const cached = getCached("message");

    if (cached) RouteResponse.json({ message: cached });

    setCache("message", "GET /users");

    return RouteResponse.json({ message: getCached("message") });
};
```

Sua tipagem é a seguinte:

```ts
/**
 * Armazenar uma resposta em cache
 * @param id Um identificador único para a rota
 * @param value A resposta a ser armazenada
 * @param duration A duração do cache em segundos, padrão 15 segundos
 */
const setCache: <T = any>(id: string, value: T, duration?: number) => void;
```