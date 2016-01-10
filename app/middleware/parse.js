import { Schema, arrayOf, normalize } from 'normalizr'
import { camelizeKeys } from 'humps'

const redBookSchema = new Schema('redBooks', { idAttribute: 'id' })
const noteSchema = new Schema('notes', {  idAttribute: 'id'})
const commentSchema = new Schema('comments', {idAttribute: 'id'})
const resultSchema = new Schema('findings', {  idAttribute: 'id'})

export const Schemas = {
  REDBOOK: redBookSchema,
  REDBOOK_ARRAY: arrayOf(redBookSchema),
  NOTE: noteSchema,
  NOTE_ARRAY: arrayOf(noteSchema),
  COMMENT: commentSchema,
  RESULT: resultSchema,
  RESULT_ARRAY: arrayOf(resultSchema),
}

const RedBook = Parse.Object.extend('RedBook');
const Note = Parse.Object.extend('Note');
const Comment = Parse.Object.extend('Comment');

function clearObjectId(obj, key){
  obj.id = obj.objectId;
  delete obj.objectId;

  if( key ){
    obj[key].id = obj[key].objectId;

    delete obj[key].objectId;
    delete obj[key].sessionToken;
    delete obj[key].type;
    delete obj[key].className;    
  }
}

const parseAPI = {
  fetchRedBook: function (schema) {

    let query = new Parse.Query(RedBook);

    return query.find()
    .then(function(data) {
      data.forEach(function(o, i, a){
        const camelizedJson = camelizeKeys(o.toJSON());
      
        clearObjectId(camelizedJson, 'creator');

        a[i] = camelizedJson;
      });

      return Object.assign({}, normalize(data, schema));
         
    }, function(error) {

      console.log(error);

    });
  },

  fetchNote: function (schema, params) {

    let noteQuery = new Parse.Query(Note);
    let commentQuery = new Parse.Query(Comment);
    let redBook = new RedBook();

    redBook.id = params.redBookId;

    noteQuery.equalTo('redBook', redBook);
    noteQuery.descending('createdAt')

    return noteQuery.find()
    .then(function(results) {

      results.forEach(function(note, i, a){

        const camelizedJson = camelizeKeys(note.toJSON());

        clearObjectId(camelizedJson, 'author');

        a[i] = camelizedJson;
      
      });

      return Object.assign({}, normalize(results, schema));
         
    }, function(error) {

      console.log(error);

    })
  },

  addRedBook: function(schema, params){

    const redBook = new RedBook();
    const note    = new Note();

    return redBook
    .save(params.RedBook)
    .then(function(book){

      params.Note.redBook = book;
      note.save(params.Note);

      let newbook = book.toJSON();

      clearObjectId(newbook, 'creator');

      return Object.assign({}, normalize(newbook, schema));


    })
  }, 

  addNote: function(schema, params){

    const note    = new Note();
    const redBook = new RedBook();
    redBook.id = params.redBookId;
    params.Note.redBook = redBook;
    
    return note
    .save(params.Note)
    .then(function(redBookNote){

      let newNote = redBookNote.toJSON();
      clearObjectId(newNote, 'author');

      return Object.assign({}, normalize(newNote, schema));

    })
  },

  addComment: function(schema, params, next, actionWith, successType, failureType){

    let noteQuery = new Parse.Query(Note);
    let commentQuery = new Parse.Query(Comment);

    noteQuery
    .get(params.noteId)
    .then(function(note){

      const comment = new Comment();
      params.Comment.parent = note;
      
      comment
      .save(params.Comment)
      .then(function(){

        commentQuery.equalTo('parent', note);
        commentQuery.find({
          success: function(comments){

            comments.forEach( function(savedComment, i, a){
              let savedJsonComment = savedComment.toJSON();
              clearObjectId(savedJsonComment, 'author');
              a[i] = savedJsonComment;
            })

            note.set('comments', comments);
            note
            .save()
            .then(function(){

              next(actionWith({
                response: comments,
                noteId: params.noteId,
                type: successType
              }))

            })
          }
        })
      })
    }, function(err){
        
      next(actionWith({
        type: failureType,
        error: error.message || 'Something bad happened'
      }))

    })
  },

  deleteNote: function(schema, params, next, actionWith, successType, failureType){

    const noteQuery = new Parse.Query(Note);
    
    noteQuery
    .get(params.noteId)
    .then(function(note){

      note.destroy({

        success: function(){
          next(actionWith({
            noteId: params.noteId,
            redBookId: params.redBookId,
            type: successType
          }))

        },

        error: function(){

          next(actionWith({
            type: failureType,
            error: error.message || 'Something bad happened'
          }))

        }

      });
      

    });
    
  }
}



export const PARSE = Symbol('Parse.com')
export default store => next => action => {

  const parseObject = action[PARSE]

  // Parse.com 으로 호출하는 API만 미들웨어가 처리한다. 
  if (typeof parseObject === 'undefined') {
    return next(action)
  }

  const { schema, types, method, params=null } = parseObject
  const [ requestType, successType, failureType ] = types

  if (!schema) {
    throw new Error('Specify one of the exported Schemas.')
  }
  if (!Array.isArray(types) || types.length !== 3) {
    throw new Error('Expected an array of three action types.')
  }
  if (!types.every(type => typeof type === 'string')) {
    throw new Error('Expected action types to be strings.')
  }

  function actionWith(data) {
    const finalAction = Object.assign({}, action, data)
    delete finalAction[PARSE]
    return finalAction
  }

  // 요청 액션을 실행하고
  next(actionWith({ type: requestType }))

  // 실제 API를 호출한다
  if( method === 'addComment' ) {
    return parseAPI[method](schema, params, next, actionWith, successType, failureType);
  } 

  if( method === 'deleteNote' ) {
    return parseAPI[method](schema, params, next, actionWith, successType, failureType);
  } 

  return parseAPI[method](schema, params).then(
    response => next(actionWith({
      response,
      type: successType
    })),
    error => next(actionWith({
      type: failureType,
      error: error.message || 'Something bad happened'
    }))
  )
}