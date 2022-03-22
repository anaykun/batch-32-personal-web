const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const db = require('./connection/db');
const upload = require('./middlewares/uploadFile');

db.connect(function (err, _, done) {
  if (err) throw err;

  console.log('Database has Connected');
  done();
});

const app = express();
const PORT = process.env.PORT || 5020;

let isLogin = false;

let projects=[];

app.set('view engine', 'hbs');
app.use(flash());
app.use(
  session({
    secret: 'rahasia',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 2 },
  })
);
app.use('/public', express.static(__dirname + '/public'));
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use(express.urlencoded({ extended: false}));

app.get('/', function(req, res){
    db.connect(function (err, client, done) {
        let  query = '';

        if (req.session.isLogin){
            query = `SELECT  tb_project.*, tb_user.id AS "user_id", tb_user.username, tb_user.email
                    FROM tb_project LEFT JOIN  tb_user 
                    ON tb_user.id = tb_project.author_id WHERE tb_user.id=${req.session.user.id} ORDER BY id ASC`;
        }else {
            query = `SELECT  tb_project.*, tb_user.id AS "user_id", tb_user.username, tb_user.email
                     FROM tb_project LEFT JOIN  tb_user 
                     ON tb_user.id = tb_project.author_id ORDER BY id ASC`;
        }
      
        // const query = 'SELECT * FROM tb_project ORDER BY id ASC';

        client.query(query, function (err, result) {
            if (err) throw err;
            done();

            let data = result.rows;
            
            let dataProjects = data.map(function (data){

                let user_id = data.user_id;
                let username = data.username;
                let email = data.email;

                delete data.user_id;
                delete data.username;
                delete data.email;

                const PATH = 'http://localhost:5020/uploads/';

                return {
                    ...data,
                    isLogin: req.session.isLogin,
                    timeCont: getTime(data.projectstartdate, data.projectenddate),
                    author: {
                        user_id,
                        username,
                        email,
                    },
                    user: req.session.user,
                    projectuploadimage: PATH + data.projectuploadimage,
                
                };
            });
            console.log(dataProjects);
            res.render('index',{
                user: req.session.user,
                isLogin: req.session.isLogin,
                projects: dataProjects,});
            
        });
    });
});

app.get('/blog-detail/:id', function(req, res){
    let id = req.params.id;
    db.connect(function (err, client, done) {
        const query = `SELECT  tb_project.*, tb_user.id AS "user_id", tb_user.username, tb_user.email
        FROM tb_project LEFT JOIN  tb_user 
        ON tb_user.id = tb_project.author_id WHERE tb_project.id=${id}`;

        client.query(query, function (err, result) {
            if (err) throw err;
            done();

            let data = result.rows[0];
            const PATH = 'http://localhost:5020/uploads/';
            

            data = {
                ...data,
                timeCont: getTime(data.projectstartdate, data.projectenddate),
                timeDetail: getFullTime(data.projectstartdate),
                timeDetail2: getFullTime(data.projectenddate),
                isLogin: req.session.isLogin,
                user: req.session.user,
                author: {
                    user_id: data.user_id,
                    username: data.username,
                    email: data.email,
                },
                projectuploadimage: PATH + data.projectuploadimage,
          
            };
            delete data.user_id;
            delete data.username;
            delete data.email;
            delete data.author_id;

            res.render('blog-detail', {
              blog:data,
              isLogin: req.session.isLogin,
              user: req.session.user,});
        });
    });
});

app.get('/project-add', function(req, res){
    db.connect(function (err, client, done) {
        const query = 'SELECT * FROM tb_project ORDER BY id ASC';

        client.query(query, function (err, result) {
            if (err) throw err;
            done();

            let data = result.rows;
            let dataProjects = data.map(function (data){
                return {
                    ...data,
                    isLogin: req.session.isLogin,
                    user: req.session.user,         
                };
            });
            res.render('project-add',{
                user: req.session.user,
                isLogin: req.session.isLogin,
                projects: dataProjects,});
            
        });
    });
});

app.post('/project-add', upload.single('projectuploadimage'), function(req, res){
    let data = req.body;

    if (data.projectname == '' || data.projectstartdate == '' || data.projectenddate == ''
    || data.projectdescription == '' || data.projectuploadimage == '' ) {
        req.flash('error', 'Please insert all field!');
        return res.redirect('/project-add');
      }

    db.connect(function(err, client, done){
        if(err) throw err;

        const query = `INSERT INTO tb_project(projectname, projectstartdate,
             projectenddate, projectdescription, projectnodejs, projectreactjs,
             projectnextjs,projecttypescript,projectuploadimage,author_id) VALUES 
             (
            '${data.projectname}', '${data.projectstartdate}',
            '${data.projectenddate}', '${data.projectdescription}', 
            '${renderChecked(data.projectnodejs)}',  
            '${renderChecked(data.projectreactjs)}',
            '${renderChecked(data.projectnextjs)}',
            '${renderChecked(data.projecttypescript)}',
            '${req.file.filename}',
             ${req.session.user.id}
            )`;
        
        client.query(query, function(err, result){
            if (err) throw err;
            done();
        })
    }) 
    res.redirect('/');
});

app.get('/project-edit/:id', function(req, res){
    let id = req.params.id;
  db.connect(function(err,client,done){
    if(err) throw err;
    const query =`SELECT * FROM tb_project WHERE id=${id}`;

    client.query(query,function(err, result) {
      if(err)throw err;
      done();

      let data = result.rows[0];
      const PATH = 'http://localhost:5020/uploads/';

      data = {
        ...data,
        projectstartdate:renderDate(data.projectstartdate),
        projectenddate:renderDate(data.projectenddate),

        projectnodejs:viewCheck(data.projectnodejs),
        projectnextjs:viewCheck(data.projectnextjs),
        projectreactjs:viewCheck(data.projectreactjs),
        projecttypescript:viewCheck(data.projecttypescript),
        isLogin: req.session.isLogin,
        user: req.session.user,
        projectuploadimage: PATH + data.projectuploadimage,
      }
    //   console.log(data);

      res.render('project-edit', {
            data,
            user: req.session.user,
            isLogin: req.session.isLogin,
            });
     
         })
    })

});

app.post('/project-edit/:id', upload.single('projectuploadimage'), function (req, res) {
    let id = req.params.id;

    let data = req.body;
    if (data.projectname == '' || data.projectstartdate == '' || data.projectenddate == ''
    || data.projectdescription == '' || req.file.filename == '' ) {
        req.flash('error', 'Please insert all field!');
        return res.redirect('/project-edit:id');
      }

    db.connect(function (err, client, done) {
        if (err) throw err;

        const query = `UPDATE tb_project
        SET projectname= '${req.body.projectname}', projectstartdate= '${req.body.projectstartdate}', 
        projectenddate='${req.body.projectenddate}', projectdescription='${req.body.projectdescription}', 
        projectnodejs=${renderChecked(req.body.projectnodejs)}, projectreactjs=${renderChecked(req.body.projectreactjs)}, 
        projectnextjs=${renderChecked(req.body.projectnextjs)}, projecttypescript=${renderChecked(req.body.projecttypescript)},
        projectuploadimage='${req.file.filename}'
        WHERE id=${id}`;

        console.log(query);

        client.query(query, function (err, result) {
            if (err) throw err;
            done();
        });
    });

    res.redirect("/");
});

app.get('/blog-delete/:id', function(req, res){
    let id = req.params.id;

    db.connect(function (err, client, done) {
        if (err) throw err;
        const query = `DELETE FROM tb_project WHERE id=${id}`;
    
        client.query(query, function (err, result) {
          if (err) throw err;
          done();
        });
      });
    res.redirect('/');
})

app.get('/register', function (req, res) {
    res.render('register');
});

app.post('/register', function (req, res) {
    const data = req.body;
  
    if (data.username == '' || data.email == '' || data.password == '') {
      req.flash('error', 'Please insert all field!');
      return res.redirect('/register');
    }
  
    const hashedPassword = bcrypt.hashSync(data.password, 10);
  
    db.connect(function (err, client, done) {
      if (err) throw err;
      done();
  
      const query = `INSERT INTO tb_user(username,email,password) VALUES ('${data.username}','${data.email}','${hashedPassword}')`;
  
      client.query(query, function (err, result) {
        if (err) throw err;
  
        req.flash('success', 'Success register your account!');
        res.redirect('/login');
      });
    });
});

app.get('/login', function (req, res) {
    res.render('login');
});

app.post('/login', function (req, res) {
    const data = req.body;
  
    if (data.email == '' || data.password == '') {
      req.flash('error', 'Please insert all field!');
      return res.redirect('/login');
    }
  
    db.connect(function (err, client, done) {
      if (err) throw err;
      done();
  
      const query = `SELECT * FROM tb_user WHERE email = '${data.email}'`;
  
      client.query(query, function (err, result) {
        if (err) throw err;
  
        // Check account by email
        if (result.rows.length == 0) {
            console.log('Email not found!');
            req.flash('error', 'Email not found!');
            return res.redirect('/login');
        }
  
        // Check password
        const isMatch = bcrypt.compareSync(
          data.password,
          result.rows[0].password
        );
  
        if (isMatch == false) {
          console.log('Wrong Password!');
          req.flash('error', 'Wrong Password!');
          return res.redirect('/login');
        }
  
        req.session.isLogin = true;
        req.session.user = {
          id: result.rows[0].id,
          email: result.rows[0].email,
          username: result.rows[0].username,
        };
  
        res.redirect('/');
        });
    });
});

app.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/');
});

app.get('/contact-me', function(req, res){
    db.connect(function (err, client, done) {
        const query = 'SELECT * FROM tb_project ORDER BY id ASC';

        client.query(query, function (err, result) {
            if (err) throw err;
            done();

            let data = result.rows;
            let dataProjects = data.map(function (data){
                return {
                    ...data,
                    isLogin: req.session.isLogin,
                    user: req.session.user,
                
                };
            });
            res.render('contact-me',{
                user: req.session.user,
                isLogin: req.session.isLogin,
                projects: dataProjects,});
            
        });
    });
});

app.listen(PORT,  function(){
    console.log(`Server starting on PORT: ${PORT}`);
});

function getTime(dateStart, dateEnd) {
 
    let time = new Date (dateEnd) - new Date (dateStart)
    let dateCont = time / (24*3600*1000)
    let fixMonth = 30;
    let fixYear = fixMonth * 12;

    let yearCont = Math.floor(dateCont / fixYear);
    let monthCont = Math.floor((dateCont % fixYear) / fixMonth);
    let weekCont = Math.floor(((dateCont % fixYear) % fixMonth) / 7);
    let dayCont = ((dateCont % fixYear) % fixMonth) % 7;
    let dateFormat = "";

    if (yearCont > 0) {
        return dateFormat += yearCont + " Year" + ' ' + monthCont + " Month";
    } else {
        if (monthCont > 0) {
            return dateFormat += monthCont + " Month" + ' ' + weekCont + " Week";
        } else {
            if (weekCont > 0) {
                return dateFormat += weekCont + " Week" + ' ' + dayCont + " Day";
            } else {
                return dateFormat += dayCont + " Day";
            }
        }
    }
}

function getFullTime(time) {
    let month = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
  
    let date = time.getDate();
    let monthIndex = time.getMonth();
    let year = time.getFullYear();
  
    let hour = time.getHours();
    let minute = time.getMinutes();
  
    let fullTime = `${date} ${month[monthIndex]} ${year}`;
  
    return fullTime;
}

function renderChecked(checker) {
    // if (checker == "true")?true:false;
    if (checker == "true") {
        return true
    } else if (checker != true) {
        return false
    }
}

function viewCheck(form) {
    if (form == true) {
        return 'checked'
    } else if (form != true) {
        return ""
    }
  }

function renderDate(formtime) {

    let hari = [
        "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", 
        "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", 
        "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"
    ]

    let bulan = [
        "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"
    ]

    let date = formtime.getDate();
    let monthIndex = formtime.getMonth();
    let year = formtime.getFullYear();

    let fullTime = `${year}-${bulan[monthIndex]}-${hari[date]}`;

    return fullTime;
}