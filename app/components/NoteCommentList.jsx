import React, { Component, PropTypes } from 'react';

import NoteCommentForm from '../components/NoteCommentForm'
import NoteComment from '../components/NoteComment'
import moment from 'moment'

export default class NoteCommentList extends Component {

  renderCommentList = () => {

    const { comments, isOpenComment, loginUser, onSubmitComment } = this.props

    return <div className="NoteCommentList">

      {comments.map( (comment,i) => {
        return <NoteComment key={i} comment={comment}></NoteComment>
      })}

      <NoteCommentForm 
        loginUser={loginUser}
        isOpenComment={isOpenComment}
        onSubmitComment={onSubmitComment} />
    
    </div>
  }

  render() {

    const { comments, isOpenComment } = this.props

    if( isOpenComment ){
      return this.renderCommentList()
    }else{
      return false  
    }
    
  }
}

NoteCommentList.propTypes = {
  loginUser: PropTypes.object.isRequired,
  comments: PropTypes.array.isRequired,
  isOpenComment: PropTypes.bool.isRequired,
  onSubmitComment: PropTypes.func.isRequired
}
