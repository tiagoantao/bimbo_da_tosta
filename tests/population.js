import chai from 'chai'
var assert = chai.assert

import * as population from '../lib/metis/population.js'
import * as individual from '../lib/metis/individual.js'
import * as utils from './utils.js'

describe('Population generation', () => {
    it('single individual', () => {
        let inds = population.generate_n_inds(1, () =>
            individual.generate_basic_individual(utils.empty_species))
        assert.equal(inds.length, 1)
    })
})
