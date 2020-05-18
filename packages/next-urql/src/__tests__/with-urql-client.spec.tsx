import React from 'react';
import { shallow, configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Client, defaultExchanges } from 'urql';

import { withUrqlClient, NextUrqlPageContext } from '..';
import * as init from '../init-urql-client';

beforeEach(jest.clearAllMocks);

const MockApp: React.FC<any> = () => {
  return <div />;
};

const MockAppTree: React.FC<any> = () => {
  return <div />;
};

describe('withUrqlClient', () => {
  const spyInitUrqlClient = jest.spyOn(init, 'initUrqlClient');
  let Component: any;

  beforeAll(() => {
    configure({ adapter: new Adapter() });
  });

  describe('with client options', () => {
    beforeEach(() => {
      Component = withUrqlClient(() => ({ url: 'http://localhost:3000' }))(
        MockApp
      );
    });

    const mockContext: NextUrqlPageContext = {
      AppTree: MockAppTree,
      pathname: '/',
      query: {},
      asPath: '/',
      urqlClient: {} as Client,
    };

    it('should create the client instance when the component mounts', () => {
      const tree = shallow(<Component />);
      const app = tree.find(MockApp);

      expect(app.props().urqlClient).toBeInstanceOf(Client);
      expect(app.props().urqlClient.url).toBe('http://localhost:3000');
      expect(spyInitUrqlClient).toHaveBeenCalledTimes(1);
    });

    it('should create the urql client instance server-side inside getInitialProps', async () => {
      const props =
        Component.getInitialProps &&
        (await Component.getInitialProps(mockContext));
      expect(spyInitUrqlClient).toHaveBeenCalledTimes(1);

      const tree = shallow(<Component {...props} />);
      const app = tree.find(MockApp);

      expect(app.props().urqlClient).toBeInstanceOf(Client);
      expect(app.props().urqlClient.url).toEqual('http://localhost:3000');
    });
  });

  describe('with ctx callback to create client options', () => {
    // Simulate a token that might be passed in a request to the server-rendered application.
    const token = Math.random().toString(36).slice(-10);

    const mockContext: NextUrqlPageContext = {
      AppTree: MockAppTree,
      pathname: '/',
      query: {},
      asPath: '/',
      req: {
        headers: {
          cookie: token,
        },
      } as NextUrqlPageContext['req'],
      urqlClient: {} as Client,
    };

    beforeEach(() => {
      Component = withUrqlClient((ssrExchange, ctx) => ({
        url: 'http://localhost:3000',
        fetchOptions: {
          headers: { Authorization: (ctx && ctx.req!.headers!.cookie) || '' },
        },
        exchanges: [ssrExchange, ...defaultExchanges],
      }))(MockApp);
    });

    it('should allow a user to access the ctx object from Next on the server', async () => {
      Component.getInitialProps &&
        (await Component.getInitialProps(mockContext));
      expect(spyInitUrqlClient).toHaveBeenCalledWith({
        url: 'http://localhost:3000',
        fetchOptions: { headers: { Authorization: token } },
      });
    });
  });

  describe('with mergeExchanges provided', () => {
    const exchange = jest.fn(() => op => op);

    beforeEach(() => {
      Component = withUrqlClient(() => ({
        url: 'http://localhost:3000',
        exchanges: [exchange] as any[],
      }))(MockApp);
    });

    it('calls the user-supplied mergeExchanges function', () => {
      const tree = shallow(<Component />);
      const app = tree.find(MockApp);

      const client = app.props().urqlClient;
      expect(client).toBeInstanceOf(Client);
    });

    it('uses exchanges returned from mergeExchanges', () => {
      const tree = shallow(<Component />);
      const app = tree.find(MockApp);

      const client = app.props().urqlClient;
      client.query(`
        {
          users {
            id
          }
        }
      `);
      expect(exchange).toBeCalledTimes(1);
    });
  });
});
