import { createStore } from 'redux';
import Phone from './Phone';
import apiConfig from './config/apiConfig';
import brandConfig from './config/brandConfig';
import uuid from 'uuid';

export default function getTestPhone() {
  const testPhone = new Phone({
    ...apiConfig,
    ...brandConfig,
    prefix: uuid.v4()
  });
  const store = createStore(testPhone.reducer);
  testPhone.setStore(store);
  return testPhone;
}
