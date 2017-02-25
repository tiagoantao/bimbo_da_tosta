import chai from 'chai'
var assert = chai.assert

import * as simulator from '../lib/metis/simulator.js'
import * as reproduction from '../lib/metis/operators/reproduction.js'
import * as utils from './test_utils.js'

describe('Basic simulation', () => {
    it('No Ops simulation', () => {
        let individuals = utils.generate_n_basic_individuals(10)
        let orig_individuals = individuals.slice() 
        let state = {
            individuals, operators: [],
            cycle: 0,
            global_parameters: {}
        }
        simulator.cycle(state)
        assert.equal(state.cycle, 1)
        assert.equal(state.individuals.length, orig_individuals.length)
    })
    it('Reproduction simulation', () => {
        let size = 10
        let rep_size = 20
        let individuals = utils.generate_n_basic_individuals(size)
        let operators = [new reproduction.NoGenomeSexualReproduction(
            utils.empty_species, rep_size)]
        let state = {
            individuals, operators,
            cycle: 0,
            global_parameters: {}
        }
        simulator.cycle(state)
        assert.equal(state.individuals.length, size + rep_size)
    })
})


describe('Several Cycles', () => {
    it('do_n_cycles - no ops', () => {
        let individuals = utils.generate_n_basic_individuals(10)
        let orig_individuals = individuals.slice() 
        let state = simulator.do_n_cycles(2, individuals, [])
        assert.equal(state.cycle, 3)
        assert.equal(state.individuals.length, orig_individuals.length)
    })
})
