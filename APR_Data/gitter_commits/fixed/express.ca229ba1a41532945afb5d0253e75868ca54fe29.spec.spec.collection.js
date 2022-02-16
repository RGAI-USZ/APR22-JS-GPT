
process.mixin(require('express/collection'))

describe 'Express'
  describe 'Collection'
    describe '$(array)'
      it 'should return a Collection'
        $(['foo', 'bar']).should.be_an_instance_of Collection
      end
    end
    
    describe '$(object)'
      it 'should return a Collection'
        $({ foo: 'bar' }).should.be_an_instance_of Collection
      end
    end
    
    describe '$(Collection)'
      it 'should return the collection passed'
        var collection = $(['foo'])
        $(collection).should.equal collection
      end
    end
    
    describe '#at()'
      it 'should return the value at the given index'
        $(['foo', 'bar']).at(0).should.eql 'foo'
        $(['foo', 'bar']).at(1).should.eql 'bar'
        $(['foo', 'bar']).at(2).should.be_null
      end
      
      it 'should work with objects'
        $({ foo: 'bar', baz: 'raz' }).at(0).should.eql 'bar'
        $({ foo: 'bar', baz: 'raz' }).at(1).should.eql 'raz'
        $({ foo: 'bar', baz: 'raz' }).at(2).should.be_null
      end
    end
    
    describe '#each()'
      it 'should iterate passing index and value'
        var result = []
        $(['foo', 'bar']).each(function(val, i){
          result.push(i, val)
        })
        result.should.eql [0, 'foo', 1, 'bar']
      end
      
      it 'should work with objects'
        var result = []
        $({ foo: 'bar', baz: 'raz' }).each(function(val, key){
          result.push(key, val)
        })
        result.should.eql ['foo', 'bar', 'baz', 'raz']
      end
      
      it 'should return the collection'
        $([]).each(function(){}).should.be_an_instance_of Collection
      end
    end
    
    describe '#reduce()'
      it 'should iterate with memo object'
        var sum = $([1,2,3]).reduce(0, function(sum, n){ return sum + n })
        sum.should.eql 6
      end
    end
    
    describe '#map()'
      it 'should iterate collecting results into a new collection'
        var collection = $(['foo', 'bar']).map(function(val){ return val.toUpperCase() })
        collection.at(0).should.eql 'FOO'
        collection.at(1).should.eql 'BAR'
      end
      
      it 'should work with objects'
        var collection = $({ foo: 'bar', baz: 'raz' }).map(function(val){ return val.toUpperCase() })
        collection.at(0).should.eql 'BAR'
        collection.at(1).should.eql 'RAZ'
      end
    end
    
    describe '#first()'
      it 'should return the first value'
        $(['foo']).first().should.eql 'foo'
      end
      
      it 'should return the first n values'
        $([5,4,3,2,1]).first(2).at(0).should.eql 5
        $([5,4,3,2,1]).first(2).at(1).should.eql 4
      end
      
      it 'should work with objects'
        $({ foo: 'bar' }).first().should.eql 'bar'
      end  
    end
    
    describe '#find()'
      it 'should return the value of the first match'
        var result = $(['foo', 'bar']).find(function(val){ return val.charAt(0) == 'b' })
        result.should.eql 'bar'
      end
      
      it 'should return null when nothing matches'
        var result = $(['foo', 'bar']).find(function(val){ return val.charAt(0) == 'a' })
        result.should.be_null
      end
      
      it 'should work with objects'
        var result = $({ foo: 'bar', baz: 'raz' }).find(function(val, key){
          return val.charAt(0) == 'r'
        })
        result.should.eql 'raz'
      end
    end
    
    describe '#any()'
      it 'should return true when found'
        $(['foo', 'bar']).any(function(val){ return val.charAt(0) == 'b' }).should.be_true
      end
      
      it 'should return false when not found'
        $(['foo', 'bar']).any(function(val){ return val.charAt(0) == 'r' }).should.be_false
      end
    end
    
    describe '#select()'
      it 'should return values which evaluate to true'
        var result = $([1,2,3,4,5]).select(function(n){ return n % 2 })
        result.at(0).should.eql 0
        result.at(1).should.eql 2
        result.at(2).should.eql 4
      end
      
      it 'should return a Collection'
        var result = $([1,2,3,4,5]).select(function(n){ return n % 2 })
        result.should.be_an_instance_of Collection
      end
    end
    
    describe '#slice()'
      it 'should return a slice of values'
        var collection = $(['foo', 'bar', 'baz']).slice(1, 3)
        collection.at(0).should.eql 'bar'
        collection.at(1).should.eql 'baz'
      end
      
      it 'should work with objects'
        var collection = $({ foo: 1, bar: 2, baz: 3, raz: 4 }).slice(1, 3)
        collection.at(0).should.eql 2
        collection.at(1).should.eql 3        
      end
    end
    
  end
end