const chai = require('chai')
const assert = chai.assert

const all = require('../../../lib/metis-sim/all.js')
const utils = require('../test_utils.js')

describe('Culling', () => {
    let kill_older = new all.ops_culling_KillOlderGenerations()
    let individuals = utils.generate_n_basic_individuals(10, 0)
    it('Remove all individuals', () => {
        let state = {
            individuals,
            global_parameters: {},
            cycle: 1,
            operators: []
        }
        kill_older.change(state)
        assert.equal(state.individuals.length, 0)
    })
    it('Save all individuals', () => {
        let state = {
            global_parameters: {},
            cycle: 0,
            individuals,
            operators: []
        }
        kill_older.change(state)
        assert.equal(state.individuals.length, 10)
    })
    it('Save one individual', () => {
        let add_individuals = individuals.slice()
        add_individuals.push(all.i_generate_basic_individual(utils.empty_species, 1))
        let state = {
            global_parameters: {},
            cycle: 1,
            individuals: add_individuals,
            operators: []
        }
        kill_older.change(state)
        assert.equal(state.individuals.length, 1)
    })
})
