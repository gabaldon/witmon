import axios from 'axios'

export class WittyCreaturesApi {
  constructor () {
    this.baseUrl = 'http://127.0.0.1:3000'
  }

  _handleResponse (response) {
    if (response && response.data) {
      return response.data
    }
  }

  _handleError (error) {
    return { error }
  }

  _get ({ url, params }) {
    return axios
      .get(url, params)
      .then(this._handleResponse)
      .catch(this._handleError)
  }

  _post ({ url, data, params }) {
    console.log('PARAMS', params)
    console.log('URL', url)
    return axios
      .post(url, data, params)
      .then(this._handleResponse)
      .catch(this._handleError)
  }

  claim (params) {
    return this._post({ url: `${this.baseUrl}/claim`, data: params })
  }

  getEggInfo (params) {
    return this._get({
      url: `${this.baseUrl}/eggs/${params.id}`,
      params: {
        headers: { authorization: params.token }
      }
    })
  }

  getEggList (params) {
    return this._get({
      url: `${this.baseUrl}/eggs`,
      params: {
        headers: { authorization: params.token }
      }
    })
  }

  incubate (params) {
    return this._post({
      url: `${this.baseUrl}/eggs/incubate`,
      data: { target: params.key },
      params: { headers: { authorization: params.token } }
    })
  }
}
