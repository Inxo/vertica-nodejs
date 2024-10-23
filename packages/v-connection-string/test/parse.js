// Copyright (c) 2022-2024 Open Text.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

var chai = require('chai')
var expect = chai.expect
chai.should()

var parse = require('../').parse

describe('parse', function () {
  it('using connection string in client constructor', function () {
    var subject = parse('vertica://brian:pw@boom:381/lala')
    subject.user.should.equal('brian')
    subject.password.should.equal('pw')
    subject.host.should.equal('boom')
    subject.port.should.equal('381')
    subject.database.should.equal('lala')
  })

  it('escape spaces if present', function () {
    var subject = parse('vertica://localhost/post gres')
    subject.database.should.equal('post gres')
  })

  it('do not double escape spaces', function () {
    var subject = parse('vertica://localhost/post%20gres')
    subject.database.should.equal('post gres')
  })

  it('initializing with unix domain socket', function () {
    var subject = parse('/var/run/')
    subject.host.should.equal('/var/run/')
  })

  it('initializing with unix domain socket and a specific database, the simple way', function () {
    var subject = parse('/var/run/ mydb')
    subject.host.should.equal('/var/run/')
    subject.database.should.equal('mydb')
  })

  it('initializing with unix domain socket, the health way', function () {
    var subject = parse('socket:/some path/?db=my[db]&encoding=utf8')
    subject.host.should.equal('/some path/')
    subject.database.should.equal('my[db]', 'must to be escaped and unescaped trough "my%5Bdb%5D"')
    subject.client_encoding.should.equal('utf8')
  })

  it('initializing with unix domain socket, the escaped health way', function () {
    var subject = parse('socket:/some%20path/?db=my%2Bdb&encoding=utf8')
    subject.host.should.equal('/some path/')
    subject.database.should.equal('my+db')
    subject.client_encoding.should.equal('utf8')
  })

  it('initializing with unix domain socket, username and password', function () {
    var subject = parse('socket://brian:pw@/var/run/?db=mydb')
    subject.user.should.equal('brian')
    subject.password.should.equal('pw')
    subject.host.should.equal('/var/run/')
    subject.database.should.equal('mydb')
  })

  it('password contains  < and/or >  characters', function () {
    var sourceConfig = {
      user: 'brian',
      password: 'hello<ther>e',
      port: 5432,
      host: 'localhost',
      database: 'postgres',
    }
    var connectionString =
      'vertica://' +
      sourceConfig.user +
      ':' +
      sourceConfig.password +
      '@' +
      sourceConfig.host +
      ':' +
      sourceConfig.port +
      '/' +
      sourceConfig.database
    var subject = parse(connectionString)
    subject.password.should.equal(sourceConfig.password)
  })

  it('password contains colons', function () {
    var sourceConfig = {
      user: 'brian',
      password: 'hello:pass:world',
      port: 5432,
      host: 'localhost',
      database: 'postgres',
    }
    var connectionString =
      'vertica://' +
      sourceConfig.user +
      ':' +
      sourceConfig.password +
      '@' +
      sourceConfig.host +
      ':' +
      sourceConfig.port +
      '/' +
      sourceConfig.database
    var subject = parse(connectionString)
    subject.password.should.equal(sourceConfig.password)
  })

  it('username or password contains weird characters', function () {
    var strang = 'vertica://my f%irst name:is&%awesome!@localhost:9000'
    var subject = parse(strang)
    subject.user.should.equal('my f%irst name')
    subject.password.should.equal('is&%awesome!')
    subject.host.should.equal('localhost')
  })

  it('url is properly encoded', function () {
    var encoded = 'vertica://bi%25na%25%25ry%20:s%40f%23@localhost/%20u%2520rl'
    var subject = parse(encoded)
    subject.user.should.equal('bi%na%%ry ')
    subject.password.should.equal('s@f#')
    subject.host.should.equal('localhost')
    subject.database.should.equal(' u%20rl')
  })

  it('relative url sets database', function () {
    var relative = 'vertica:///different_db_on_default_host'
    var subject = parse(relative)
    subject.database.should.equal('different_db_on_default_host')
  })

  it('no pathname returns null database', function () {
    var subject = parse('vertica://myhost')
    ;(subject.database === null).should.equal(true)
  })

  it('pathname of "/" returns null database', function () {
    var subject = parse('vertica://myhost/')
    subject.host.should.equal('myhost')
    ;(subject.database === null).should.equal(true)
  })

  it('configuration parameter host', function () {
    var subject = parse('vertica://user:pass@/dbname?host=/unix/socket')
    subject.user.should.equal('user')
    subject.password.should.equal('pass')
    subject.host.should.equal('/unix/socket')
    subject.database.should.equal('dbname')
  })

  it('configuration parameter host overrides url host', function () {
    var subject = parse('vertica://user:pass@localhost/dbname?host=/unix/socket')
    subject.host.should.equal('/unix/socket')
  })

  it('url with encoded socket', function () {
    var subject = parse('vertica://user:pass@%2Funix%2Fsocket/dbname')
    subject.user.should.equal('user')
    subject.password.should.equal('pass')
    subject.host.should.equal('/unix/socket')
    subject.database.should.equal('dbname')
  })

  it('url with real host and an encoded db name', function () {
    var subject = parse('vertica://user:pass@localhost/%2Fdbname')
    subject.user.should.equal('user')
    subject.password.should.equal('pass')
    subject.host.should.equal('localhost')
    subject.database.should.equal('%2Fdbname')
  })

  it('configuration parameter host treats encoded socket as part of the db name', function () {
    var subject = parse('vertica://user:pass@%2Funix%2Fsocket/dbname?host=localhost')
    subject.user.should.equal('user')
    subject.password.should.equal('pass')
    subject.host.should.equal('localhost')
    subject.database.should.equal('%2Funix%2Fsocket/dbname')
  })

  it('configuration parameter options', function () {
    var connectionString = 'vertica:///?options=-c geqo=off'
    var subject = parse(connectionString)
    subject.options.should.equal('-c geqo=off')
  })

  it('configuration parameter oauth_access_token, workload, client_label', function () {
    var connectionString = 'vertica:///dbname?oauth_access_token=xxx&workload=analytics&client_label=vertica-nodejs'
    var subject = parse(connectionString)
    subject.oauth_access_token.should.equal('xxx')
    subject.workload.should.equal('analytics')
    subject.client_label.should.equal('vertica-nodejs')
  })

  it('configuration parameter tls_mode=require', function () {
    var connectionString = 'vertica:///?tls_mode=require'
    var subject = parse(connectionString)
    subject.tls_mode.should.equal('require')
  })

  it('configuration parameter tls_mode=disable', function () {
    var connectionString = 'vertica:///?tls_mode=disable'
    var subject = parse(connectionString)
    subject.tls_mode.should.equal('disable')
  })

  it('set tls_mode', function () {
    var subject = parse('vertica://myhost/db?tls_mode=require')
    subject.tls_mode.should.equal('require')
  })

  // MUTUAL MODE TESTS - ENABLE WITH mTLS
  /*
  it('configuration parameter sslcert=/path/to/cert', function () {
    var connectionString = 'pg:///?sslcert=' + __dirname + '/example.cert'
    var subject = parse(connectionString)
    subject.ssl.should.eql({
      cert: 'example cert\n',
    })
  })

  it('configuration parameter sslkey=/path/to/key', function () {
    var connectionString = 'pg:///?sslkey=' + __dirname + '/example.key'
    var subject = parse(connectionString)
    subject.ssl.should.eql({
      key: 'example key\n',
    })
  })
  */ 

  it('configuration parameter tls_trusted_certs=/path/to/ca', function () {
    var connectionString = 'vertica:///?tls_trusted_certs=' + __dirname + '/example.ca'
    var subject = parse(connectionString)
    subject.tls_trusted_certs.should.eql(__dirname + '/example.ca')
  })

  it('configuration parameter tls_mode=no-verify', function () {
    var connectionString = 'vertica:///?tls_mode=no-verify' // not a supported tls_mode, should instead default to prefer
    var subject = parse(connectionString)
    subject.tls_mode.should.eql('prefer')
  })

  it('configuration parameter tls_mode=verify-ca', function () {
    var connectionString = 'vertica:///?tls_mode=verify-ca'
    var subject = parse(connectionString)
    subject.tls_mode.should.eql('verify-ca')
  })

  it('configuration parameter tls_mode=verify-full', function () {
    var connectionString = 'vertica:///?tls_mode=verify-full'
    var subject = parse(connectionString)
    subject.tls_mode.should.eql('verify-full')
  })

  it('allow other params like max, ...', function () {
    var subject = parse('vertica://myhost/db?max=18&min=4')
    subject.max.should.equal('18')
    subject.min.should.equal('4')
  })

  it('configuration parameter keepalives', function () {
    var connectionString = 'vertica:///?keepalives=1'
    var subject = parse(connectionString)
    subject.keepalives.should.equal('1')
  })

  it('unknown configuration parameter is passed into client', function () {
    var connectionString = 'vertica:///?ThereIsNoSuchPostgresParameter=1234'
    var subject = parse(connectionString)
    subject.ThereIsNoSuchPostgresParameter.should.equal('1234')
  })

  it('do not override a config field with value from query string', function () {
    var subject = parse('socket:/some path/?db=my[db]&encoding=utf8&client_encoding=bogus')
    subject.host.should.equal('/some path/')
    subject.database.should.equal('my[db]', 'must to be escaped and unescaped through "my%5Bdb%5D"')
    subject.client_encoding.should.equal('utf8')
  })

  it('return last value of repeated parameter', function () {
    var connectionString = 'vertica:///?keepalives=1&keepalives=0'
    var subject = parse(connectionString)
    subject.keepalives.should.equal('0')
  })
})
